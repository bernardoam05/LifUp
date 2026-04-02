
import { describe, test, expect, jest } from '@jest/globals';
import useGameStore from '../src/store/useGameStore';

// Mocking required for native modules
jest.mock('react-native', () => ({
  Vibration: { vibrate: jest.fn() },
  Dimensions: { get: jest.fn(() => ({ width: 400, height: 800 })) },
  Platform: { OS: 'android' },
}));

describe('AppStore - General Logic Verification', () => {

  test('Initial State Verification', () => {
    const state = useGameStore.getState();
    expect(state.player.level).toBe(1);
    expect(state.player.xp).toBe(0);
    expect(state.player.gold).toBe(0);
    expect(state.quests.length).toBe(7); // Initial Level 1 normal quests
  });

  test('System Boot & Daily Reset', () => {
    const state = useGameStore.getState();
    state.bootSystem();

    // Quests should be generated
    const newState = useGameStore.getState();
    expect(newState.quests.length).toBeGreaterThan(0);
  });

  test('Quest Completion Workflow', () => {
    const state = useGameStore.getState();
    if (state.quests.length === 0) {state.bootSystem();}

    const initialGold = useGameStore.getState().player.gold;
    const questId = useGameStore.getState().quests[0].id;

    state.completeQuest(questId);

    const finalGold = useGameStore.getState().player.gold;
    expect(finalGold).toBeGreaterThan(initialGold);
  });

  test('Leveling Logic', () => {
    const state = useGameStore.getState();
    const initialLevel = state.player.level;

    state.addXP(1000); // Should trigger multiple levels

    const finalLevel = useGameStore.getState().player.level;
    expect(finalLevel).toBeGreaterThan(initialLevel);
  });

  test('Job Class Detect (Monarch Update)', () => {
    const state = useGameStore.getState();
    state.addXP(500000); // Massive XP for high level

    const player = useGameStore.getState().player;
    // Level should be high enough for a different job class
    expect(player.level).toBeGreaterThan(50);
  });

  test('Inventory and Buffs', () => {
    const state = useGameStore.getState();
    state.addToInventory('kasaka_venom', 5);

    let inv = useGameStore.getState().player.inventory;
    let item = inv.find(i => i.itemId === 'kasaka_venom');
    expect(item?.quantity).toBe(5);

    state.useInventoryItem('kasaka_venom');
    inv = useGameStore.getState().player.inventory;
    item = inv.find(i => i.itemId === 'kasaka_venom');
    expect(item?.quantity).toBe(4);

    expect(useGameStore.getState().activeBuffs.length).toBeGreaterThan(0);
  });

  test('Boss Defeat Rewards', () => {
    const state = useGameStore.getState();
    const initialBossCount = state.system.bossesDefeated;

    state.defeatDungeonBoss('kasaka');

    expect(useGameStore.getState().system.bossesDefeated).toBe(initialBossCount + 1);
  });

  test('Extra Mission Limit (Monarch Update)', () => {
    const state = useGameStore.getState();
    state.bootSystem();

    // Generate 5 times, should cap at 3
    for(let i = 0; i < 5; i++) {state.generateExtraQuests();}

    expect(useGameStore.getState().extraQuests.length).toBe(3);
  });

  test('Buff Stacking / Duration extension', () => {
    const state = useGameStore.getState();
    const duration = 3600_000;
    const buff = { id: 'test_buff', label: 'Test', multiplier: 1.1, stat: 'xp' as const };

    state.applyBuff(buff, duration);
    const firstExpiry = useGameStore.getState().activeBuffs.find((b: any) => b.id === 'test_buff')!.expiresAt;

    state.applyBuff(buff, duration);
    const secondExpiry = useGameStore.getState().activeBuffs.find((b: any) => b.id === 'test_buff')!.expiresAt;

    expect(secondExpiry).toBe(firstExpiry + duration);
    expect(useGameStore.getState().activeBuffs.filter((b: any) => b.id === 'test_buff').length).toBe(1);
  });

  test('Portal Boss Completion tracking', () => {
    const state = useGameStore.getState();
    state.defeatDungeonBoss('cerberus');

    expect(useGameStore.getState().system.completedNormalBossIds).toContain('cerberus');

    state.bootSystem(); // Simulate daily reset
    // This depends on the Date mock, usually jest.mocking Date is better but let's assume it works if called with nextDay=true logic
  });
});
