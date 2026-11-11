// Run with `npm test` in firebase/ (starts the Firestore emulator; needs Java 11+).
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp, deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, updateDoc,
  arrayUnion, deleteField, writeBatch,
} from 'firebase/firestore';

let env;
const days = (n) => Timestamp.fromMillis(Date.now() + n * 86400000);
const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

const pair = (over = {}) => ({
  createdBy: 'ana', members: ['ana'], quest: 'pushups',
  recurrence: { kind: 'daily' }, tz: 'Europe/Lisbon', start: '2026-11-11', secret: 'k'.repeat(43), expireAt: days(30), ...over,
});
const part = (over = {}) => ({ name: 'Ana', level: 12, done: {}, expireAt: days(30), ...over });

// Ana's pair p1, with a live invite ABCDEFGH; Rui has the code.
async function seed({ joined = false } = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const f = ctx.firestore();
    await setDoc(doc(f, 'pairs/p1'), pair(joined ? { members: ['ana', 'rui'], invite: 'ABCDEFGH' } : {}));
    await setDoc(doc(f, 'invites/ABCDEFGH'), { pairId: 'p1', by: 'ana', expireAt: days(1) });
    await setDoc(doc(f, 'pairs/p1/parts/ana'), part());
    if (joined) await setDoc(doc(f, 'pairs/p1/parts/rui'), part({ name: 'Rui', level: 30 }));
  });
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-pairs',
    firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

describe('pairs', () => {
  it('needs sign-in for anything', async () => {
    await assertFails(setDoc(doc(db(null), 'pairs/p1'), pair()));
  });

  it('lets you create your own pair, alone in it', async () => {
    await assertSucceeds(setDoc(doc(db('ana'), 'pairs/p1'), pair()));
    await assertFails(setDoc(doc(db('ana'), 'pairs/p2'), pair({ members: ['ana', 'rui'] })));
    await assertFails(setDoc(doc(db('ana'), 'pairs/p3'), pair({ createdBy: 'rui', members: ['rui'] })));
    await assertFails(setDoc(doc(db('ana'), 'pairs/p4'), pair({ extra: 1 })));
    await assertFails(setDoc(doc(db('ana'), 'pairs/p5'), pair({ expireAt: days(400) })));
    await assertFails(setDoc(doc(db('ana'), 'pairs/p6'), pair({ secret: 'short' })));
  });

  it('never lists pairs or invites', async () => {
    await seed({ joined: true });
    await assertFails(getDocs(collection(db('ana'), 'pairs')));
    await assertFails(getDocs(collection(db('ana'), 'invites')));
  });

  it('only members read a pair', async () => {
    await seed({ joined: true });
    await assertSucceeds(getDoc(doc(db('rui'), 'pairs/p1')));
    await assertFails(getDoc(doc(db('eva'), 'pairs/p1')));
  });

  it('joins with a live invite, adding only yourself', async () => {
    await seed();
    const rui = db('rui');
    await assertSucceeds(getDoc(doc(rui, 'invites/ABCDEFGH')));
    await assertFails(updateDoc(doc(rui, 'pairs/p1'), { members: ['ana', 'rui'] }));               // no code
    await assertFails(updateDoc(doc(rui, 'pairs/p1'), { members: ['ana', 'rui'], invite: 'ZZZZZZZZ' }));
    await assertFails(updateDoc(doc(rui, 'pairs/p1'), { members: ['ana', 'eva'], invite: 'ABCDEFGH' }));
    await assertFails(updateDoc(doc(rui, 'pairs/p1'), { members: ['ana', 'rui'], invite: 'ABCDEFGH', quest: 'run' }));
    await assertSucceeds(updateDoc(doc(rui, 'pairs/p1'), { members: arrayUnion('rui'), invite: 'ABCDEFGH' }));
    await assertFails(updateDoc(doc(db('eva'), 'pairs/p1'), { members: ['ana', 'rui', 'eva'], invite: 'ABCDEFGH' }));
  });

  it('refuses an expired invite', async () => {
    await seed();
    await env.withSecurityRulesDisabled((ctx) =>
      setDoc(doc(ctx.firestore(), 'invites/ABCDEFGH'), { pairId: 'p1', by: 'ana', expireAt: days(-1) }));
    await assertFails(getDoc(doc(db('rui'), 'invites/ABCDEFGH')));
    await assertFails(updateDoc(doc(db('rui'), 'pairs/p1'), { members: ['ana', 'rui'], invite: 'ABCDEFGH' }));
  });

  it('invites: only the lone creator makes them, with a valid code', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'pairs/p1'), pair()));
    const inv = { pairId: 'p1', by: 'ana', expireAt: days(1) };
    await assertSucceeds(setDoc(doc(db('ana'), 'invites/QRSTUV23'), inv));
    await assertFails(setDoc(doc(db('ana'), 'invites/short'), inv));
    await assertFails(setDoc(doc(db('ana'), 'invites/QRSTUV24'), { ...inv, expireAt: days(3) }));
    await assertFails(setDoc(doc(db('eva'), 'invites/QRSTUV25'), { ...inv, by: 'eva' }));
  });

  it('members stay, leave or end the pair; others cannot', async () => {
    await seed({ joined: true });
    await assertSucceeds(updateDoc(doc(db('rui'), 'pairs/p1'), { expireAt: days(30) }));
    await assertFails(updateDoc(doc(db('rui'), 'pairs/p1'), { quest: 'run' }));
    await assertFails(updateDoc(doc(db('ana'), 'pairs/p1'), { secret: 'x'.repeat(43) }));
    await assertFails(updateDoc(doc(db('rui'), 'pairs/p1'), { members: ['rui'] }));           // removing Ana
    await assertSucceeds(updateDoc(doc(db('rui'), 'pairs/p1'), { members: ['ana'] }));         // leaving
    await assertFails(deleteDoc(doc(db('eva'), 'pairs/p1')));
    await assertSucceeds(deleteDoc(doc(db('ana'), 'pairs/p1')));
  });
});

describe('parts', () => {
  it('only the owner writes it, the pair reads both', async () => {
    await seed({ joined: true });
    await assertFails(updateDoc(doc(db('rui'), 'pairs/p1/parts/ana'), { level: 99 }));
    await assertSucceeds(updateDoc(doc(db('rui'), 'pairs/p1/parts/rui'), { level: 31 }));
    const both = await assertSucceeds(getDocs(collection(db('ana'), 'pairs/p1/parts')));
    if (both.size !== 2) throw new Error(`expected 2 parts, got ${both.size}`);
    await assertFails(getDoc(doc(db('eva'), 'pairs/p1/parts/ana')));
    await assertFails(setDoc(doc(db('eva'), 'pairs/p1/parts/eva'), part({ name: 'Eva' })));
  });

  it('a cycle is marked done with the server time, once, and never rewritten', async () => {
    await seed({ joined: true });
    const ref = doc(db('ana'), 'pairs/p1/parts/ana');
    const mark = (k, at, amount = 20) => updateDoc(ref, { last: k, [`done.${k}`]: { at, amount } });

    await assertFails(mark('2026-11-11', Timestamp.fromMillis(Date.now() - 3600000)));   // backdated
    await assertFails(mark('2026-1-11', serverTimestamp()));
    await assertFails(mark('2026-11-11', serverTimestamp(), -5));
    await assertFails(updateDoc(ref, { last: '2026-11-11', 'done.2026-11-11': { at: serverTimestamp(), amount: 20, x: 1 } }));
    await assertSucceeds(mark('2026-11-11', serverTimestamp()));
    await assertFails(mark('2026-11-11', serverTimestamp(), 40));                         // rewrite
    await assertFails(updateDoc(ref, { last: '2026-11-12', 'done.2026-11-12': { at: serverTimestamp(), amount: 20 }, 'done.2026-11-13': { at: serverTimestamp(), amount: 20 } }));
    await assertSucceeds(mark('2026-11-12', serverTimestamp()));
    await assertSucceeds(updateDoc(ref, { 'done.2026-11-11': deleteField() }));           // pruning
  });

  it('keeps the part small', async () => {
    await seed({ joined: true });
    const ref = doc(db('ana'), 'pairs/p1/parts/ana');
    await assertFails(updateDoc(ref, { name: 'x'.repeat(25) }));
    await assertFails(updateDoc(ref, { level: 0 }));
    await assertFails(updateDoc(ref, { note: 'hi' }));
    await assertFails(updateDoc(ref, { expireAt: days(90) }));
  });

  it('cleans up: your own part always, the other while still in the pair', async () => {
    await seed({ joined: true });
    const ana = db('ana');
    const batch = writeBatch(ana);
    batch.delete(doc(ana, 'pairs/p1/parts/rui'));
    batch.delete(doc(ana, 'pairs/p1/parts/ana'));
    await assertSucceeds(batch.commit());
    await assertFails(deleteDoc(doc(db('eva'), 'pairs/p1/parts/ana')));
  });
});
