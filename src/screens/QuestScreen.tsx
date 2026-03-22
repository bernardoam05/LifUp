import React, { useRef, useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, AppState, AppStateStatus,
  Vibration, TextInput, BackHandler,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore, { Quest, SideQuest } from '../store/useGameStore'
import { SHADOW_MAP } from '../data/shadows'
import { RAID_BOSSES } from '../data/bosses'
import QuestForgeScreen from './QuestForgeScreen'
import MissionActiveScreen from './MissionActiveScreen'
import CustomModal from '../components/CustomModal'
import { useLocationTracker } from '../hooks/useLocationTracker'
import { scheduleSideQuestNotification, cancelSideQuestNotification } from '../utils/notifications'
import { C, FONT, SPACING } from '../theme'

// Vibration patterns
const VIB_COMPLETE = [0, 80, 40, 120]
const VIB_FOCUS    = [0, 200, 80, 200, 80, 400]

const s = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: C.bg },
  content:       { padding: SPACING.md, paddingBottom: 96 },
  titleRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  title:         { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 3 },
  forgeBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: C.neonBlue, borderRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: 16, marginBottom: 4 },
  forgeBtnTxt:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 13, letterSpacing: 1, fontWeight: '700' },
  forgeSubtitle: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: SPACING.md },
  restBadge:        { flexDirection: 'row', alignItems: 'center', backgroundColor: C.green + '18', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: C.green + '44' },
  restTxt:          { color: C.green, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
  actionRow:        { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  actionBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingVertical: 10, backgroundColor: C.panel },
  actionBtnTxt:     { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  actionBtnSub:     { color: C.dimmed, fontSize: 9, marginTop: 2 },
  restDayBanner:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.green + '12', borderWidth: 1, borderColor: C.green + '55', borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.md },
  restDayBannerTxt: { color: C.green, fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  progressTrack: { height: 4, backgroundColor: C.border, borderRadius: 0, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: C.neonBlue, borderRadius: 0 },

  bossBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a0505', borderWidth: 1, borderColor: C.neonRed + '88', borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.sm },
  bossBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bossTitle:      { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  bossSub:        { color: '#94a3b8', fontSize: 10, marginTop: 2 },
  bossDefeatedBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.green + '12', borderWidth: 1, borderColor: C.green + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  bossDefeatedTxt: { color: C.green, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  eventCard:      { backgroundColor: '#0f0a00', borderWidth: 1, borderColor: '#f9731644', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  eventHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  eventHeaderTxt: { color: '#f97316', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  eventSub:       { color: C.dimmed, fontSize: 10, marginBottom: 6 },
  eventTrack:     { height: 6, backgroundColor: '#1a1200', borderRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: '#f9731633', marginBottom: 6 },
  eventFill:      { height: '100%', backgroundColor: '#f97316' },
  eventTrialsList:{ marginBottom: 6 },
  eventTrialRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  eventTrialTxt:  { color: C.muted, fontSize: 10 },
  eventTrialDone: { color: C.green },
  eventHint:      { color: C.muted, fontSize: 10 },

  weeklyCard:    { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: C.border },
  weeklyHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  weeklyTitle:   { flex: 1, color: '#94a3b8', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  weeklyCount:   { color: '#e2e8f0', fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700' },
  weeklyTrack:   { height: 4, backgroundColor: C.border, borderRadius: 0, overflow: 'hidden', marginBottom: 4 },
  weeklyFill:    { height: '100%', borderRadius: 0 },
  weeklyDone:    { color: C.green, fontSize: 10, fontStyle: 'italic' },
  boostBanner:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fbbf2415', borderWidth: 1, borderColor: '#fbbf2444', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  boostTxt:      { color: '#fbbf24', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  penalSection:  { marginBottom: SPACING.md, borderWidth: 1, borderColor: C.neonRed + '44', borderRadius: 4, padding: SPACING.sm },
  penalHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  penalTitle:    { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },

  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md, marginTop: 4 },
  sectionLine:    { flex: 1, height: 1, backgroundColor: C.neonBlue + '33' },
  sectionLabel:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  regenBtnInline:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.neonBlue + '15', borderWidth: 1, borderColor: C.neonBlue + '44', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  regenBtnTxt:      { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },

  statusBar:          { backgroundColor: C.panel, borderWidth: 1, borderColor: C.neonBlue + '33', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.md },
  statusBarRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statusBarLabel:     { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 2 },
  statusBarCounter:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 20, fontWeight: '900' },
  statusBarSlash:     { color: C.dimmed, fontSize: 14, fontWeight: '400' },
  statusBarBossRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 6, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 5 },
  statusBarBossLabel: { fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },

  extraInfoBox:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.gold + '10', borderWidth: 1, borderColor: C.gold + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  extraInfoTxt:      { flex: 1, color: C.gold, fontSize: 11, lineHeight: 16 },

  extraCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: C.gold + '44', borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  extraCardDone:     { opacity: 0.45 },
  extraCardLeft:     { width: 32, alignItems: 'center' },
  extraCardLabel:    { color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  extraCardDetail:   { color: C.muted, fontSize: 11, lineHeight: 16, marginBottom: 5 },
  extraRewards:      { flexDirection: 'row', alignItems: 'center' },
  extraRewardTxt:    { color: C.gold, fontSize: 11, fontWeight: '700' },
  extraBonusBadge:   { marginLeft: 8, backgroundColor: C.gold + '22', borderWidth: 1, borderColor: C.gold + '55', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  extraBonusTxt:     { color: C.gold, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 0.5 },
  extraCompleteBtn:  { width: 36, height: 36, borderRadius: 4, borderWidth: 1, borderColor: C.gold, backgroundColor: C.gold + '15', alignItems: 'center', justifyContent: 'center' },

  generateExtraBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: C.gold + '66', borderRadius: 4, paddingVertical: 14, marginBottom: SPACING.sm },
  generateExtraTxt:  { color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },
  generateExtraSub:  { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9 },
})

const qc = StyleSheet.create({
  card:      { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, marginBottom: 16, borderWidth: 1, borderColor: C.neonBlue + '33' },
  cardDone:  { opacity: 0.55 },
  header:    { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  typeTag:   { width: 28, height: 28, borderRadius: 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label:     { flex: 1, color: '#e2e8f0', fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700' },
  labelDone: { color: C.muted },
  rewards:   { flexDirection: 'row', alignItems: 'center' },
  xp:        { color: C.neonBlue, fontSize: 11, fontWeight: '700' },
  gold:      { color: C.gold, fontSize: 11, fontWeight: '700' },
  dimmedTxt: { color: C.dimmed },
  detail:    { color: C.muted, fontSize: 12, marginBottom: SPACING.md, lineHeight: 18 },
  actions:   { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 8 },
  actionTxt: { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  doneRow:   { flexDirection: 'row', alignItems: 'center' },
  doneTag:   { color: C.green, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  undoBtn:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.dimmed, borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 5 },
  undoTxt:      { color: C.muted, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
  recordChip:    { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: C.gold + '10', borderWidth: 1, borderColor: C.gold + '33', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, marginBottom: SPACING.sm },
  recordChipTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9 },
  cardActive:    { borderColor: C.neonBlue + '99', shadowColor: C.neonBlue, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  activeTimerRow:{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.neonBlue + '12', borderWidth: 1, borderColor: C.neonBlue + '55', borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 10 },
  activeTimerTxt:{ color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
  forbiddenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffffff10',
  },
  failBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef444420',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ef444440',
  },
  failBtnTxt: {
    color: '#ef4444',
    fontSize: 10,
    fontFamily: FONT.orbitron,
    marginLeft: 4,
  },
  forbiddenStatus: {
    color: '#f43f5e',
    fontSize: 9,
    fontFamily: FONT.orbitron,
    letterSpacing: 1,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffffff10',
  },
  limitControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  limitValue: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONT.orbitron,
    minWidth: 40,
    textAlign: 'center',
  },
  limitStatus: {
    fontSize: 9,
    fontFamily: FONT.orbitron,
    letterSpacing: 1,
  },
})

const fm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: '#000d', alignItems: 'center', justifyContent: 'center' },
  card:      { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.xl, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: '#a855f755' },
  title:     { color: '#a855f7', fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2, marginBottom: 4 },
  subtitle:  { color: C.muted, fontSize: 12, marginBottom: SPACING.lg },
  timerText: { color: '#fff', fontFamily: FONT.orbitron, fontSize: 52, fontWeight: '900' },
  timerSub:  { color: C.dimmed, fontSize: 11, marginTop: 4, marginBottom: SPACING.md },
  track:     { width: '100%', height: 6, backgroundColor: '#a855f718', borderRadius: 0, overflow: 'hidden', marginBottom: SPACING.lg },
  fill:      { height: '100%', backgroundColor: '#a855f7' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.dimmed, borderRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: 10 },
  cancelTxt: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
})

const gm = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: '#000d', justifyContent: 'flex-end' },
  card:     { backgroundColor: C.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, paddingBottom: 40, width: '100%', alignItems: 'center', borderWidth: 1, borderBottomWidth: 0, borderColor: C.green + '55' },
  title:    { color: C.green, fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2, marginBottom: 4 },
  subtitle: { color: C.muted, fontSize: 12, marginBottom: SPACING.lg },
  dist:     { color: '#fff', fontFamily: FONT.orbitron, fontSize: 42, fontWeight: '900' },
  distUnit: { color: C.muted, fontSize: 16 },
  track:    { width: '100%', height: 6, backgroundColor: C.green + '18', borderRadius: 0, overflow: 'hidden', marginVertical: SPACING.md },
  fill:     { height: '100%', backgroundColor: C.green },
  warnRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  warn:     { color: C.neonRed, fontSize: 11 },
  error:    { color: C.neonRed, fontSize: 12, textAlign: 'center', marginBottom: SPACING.md },
  cancelBtn:{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.dimmed, borderRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: 10, marginTop: SPACING.sm },
  cancelTxt:{ color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  timerBox:  { alignItems: 'center', marginVertical: SPACING.md },
  timerText: { color: C.green, fontFamily: FONT.orbitron, fontSize: 42, fontWeight: '900', letterSpacing: 2 },
  timerSub:  { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, marginTop: 4 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingVertical: 14 },
})

const dm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: '#000000ee', justifyContent: 'flex-end' },
  card:          { backgroundColor: '#0a0005', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: 40, width: '100%', alignItems: 'center', borderWidth: 1, borderBottomWidth: 0, borderColor: C.neonRed + '88' },
  warning:       { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 3, marginBottom: 4 },
  title:         { color: '#fff', fontFamily: FONT.orbitron, fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: SPACING.sm },
  sub:           { color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: SPACING.lg },
  missionBtn:    { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  missionIcon:   { width: 40, height: 40, borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  missionInfo:   { flex: 1 },
  missionLabel:  { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  missionDetail: { color: C.muted, fontSize: 11, lineHeight: 15 },
  eventHeader:   { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: SPACING.sm, paddingHorizontal: 4 },
  eventHeaderTxt:{ color: '#f97316', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  eventProgressTxt: { color: C.dimmed, fontSize: 11, marginBottom: SPACING.sm, alignSelf: 'flex-start' },
  eventLockedTxt: { color: C.dimmed, fontSize: 11, marginTop: SPACING.xs, marginBottom: SPACING.sm, textAlign: 'center' },
  cancelBtn:        { marginTop: SPACING.sm, paddingVertical: 10, paddingHorizontal: SPACING.xl },
  cancelTxt:        { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  shadowExtractTag: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  shadowExtractTxt: { color: C.purple, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 0.5 },
})

const bv = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: '#000000ee', justifyContent: 'flex-end' },
  card:       { backgroundColor: '#050a00', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, paddingBottom: 40, width: '100%', alignItems: 'center', borderWidth: 1, borderBottomWidth: 0, borderColor: C.gold + '66' },
  header:     { color: C.gold, fontFamily: FONT.orbitron, fontSize: 22, fontWeight: '900', letterSpacing: 2, marginBottom: SPACING.sm },
  sub:        { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginBottom: SPACING.lg },
  rewardsBox: { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, width: '100%', gap: SPACING.sm, marginBottom: SPACING.md },
  rewardRow:  { flexDirection: 'row', alignItems: 'center' },
  rewardTxt:  { color: '#e2e8f0', fontFamily: FONT.orbitron, fontSize: 16, fontWeight: '700' },
  shadowHint: { color: C.dimmed, fontSize: 10, fontStyle: 'italic', textAlign: 'center', marginBottom: SPACING.md },
  btn:        { backgroundColor: C.gold + '22', borderWidth: 1, borderColor: C.gold, borderRadius: 4, paddingVertical: 14, paddingHorizontal: SPACING.xl },
  btnTxt:     { color: C.gold, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 2 },
})

const side = StyleSheet.create({
  container: { marginTop: SPACING.md, borderWidth: 1, borderColor: C.purple + '44', borderRadius: 4, overflow: 'hidden' },
  header:    { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, backgroundColor: C.purple + '0d' },
  title:     { color: C.purple, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
  badge:     { backgroundColor: C.purple + '22', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, marginLeft: SPACING.sm },
  badgeTxt:  { color: C.purple, fontFamily: FONT.orbitron, fontSize: 9 },
  sub:       { color: C.dimmed, fontSize: 11, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, lineHeight: 16 },
  inputRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm },
  input:     { flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 10, color: '#e2e8f0', fontSize: 13 },
  addBtn:    { backgroundColor: C.purple + '18', borderWidth: 1, borderColor: C.purple + '66', borderRadius: 4, padding: 10 },
  empty:     { color: C.dimmed, fontSize: 11, fontStyle: 'italic', textAlign: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.md },
})

const sq_s = StyleSheet.create({
  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: C.border + '55', gap: SPACING.sm, borderLeftWidth: 2, borderLeftColor: 'transparent' },
  cardDone:   { opacity: 0.5 },
  cardActive: { borderLeftColor: C.purple, backgroundColor: C.purple + '08' },
  rankBadge:  { width: 28, height: 28, borderRadius: 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankTxt:    { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  info:       { flex: 1 },
  title:      { color: '#e2e8f0', fontSize: 13, lineHeight: 17 },
  titleDone:  { color: C.muted, textDecorationLine: 'line-through' },
  rewardRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  xp:         { color: C.neonBlue, fontSize: 10, fontWeight: '700' },
  gold:       { color: C.gold, fontSize: 10, fontWeight: '700' },
  dimmed:     { color: C.dimmed },
  noteLine:   { color: C.purple, fontSize: 10, marginTop: 4, fontStyle: 'italic' },
  timerRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  timerTxt:   { color: C.purple, fontFamily: FONT.orbitron, fontSize: 9, fontWeight: '700' },
  doneBtn:    { width: 32, height: 32, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  doneWrap:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionBtn:  { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.7 },
  delBtn:     { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
})

function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Quest type config ──────────────────────────────────────────────────────────

const QUEST_CONFIG: Record<Quest['type'], { icon: string; color: string }> = {
  training:  { icon: 'arm-flex',          color: '#ef4444' },
  knowledge: { icon: 'book-open-variant', color: C.neonBlue },
  focus:     { icon: 'timer-sand',        color: '#a855f7' },
  gps:       { icon: 'run-fast',          color: '#22c55e' },
  forbidden: { icon: 'cancel',            color: '#f43f5e' },
  limit:     { icon: 'speedometer',       color: '#f59e0b' },
}

// ── Dungeon Missions ───────────────────────────────────────────────────────────

type DungeonMission = {
  id:              string
  label:           string
  detail:          string
  type:            Quest['type']
  gpsTarget?:      number
  focusDuration?:  number
  shadowHint:      string
  icon:            string
  color:           string
  eventName?:      string
  eventKey?:       string
  isEventTrial?:   boolean
  isEventBoss?:    boolean
  // For custom bosses created in Forge
  customShadow?: { name: string; icon: string; questType: Quest['type'] }
}

const DUNGEON_MISSIONS: DungeonMission[] = [
  {
    id:          'boss_gps',
    label:       'Veneno de Kasaka',
    detail:      'Corre 5km sem parar. A serpente aguarda no final.',
    type:        'gps',
    gpsTarget:   5,
    shadowHint:  'Kasaka',
    icon:        'run-fast',
    color:       '#22c55e',
  },
  {
    id:          'boss_focus',
    label:       'O Trono de Igris',
    detail:      '90 min de foco absoluto. O cavaleiro negro observa. Sem distrações.',
    type:        'focus',
    focusDuration: 90 * 60_000,
    shadowHint:  'Igris',
    icon:        'timer-sand',
    color:       '#a855f7',
  },
  {
    id:          'boss_training',
    label:       'Rugido de Cerberus',
    detail:      '100 push-ups + 100 squats + 30 burpees. Paga com suor.',
    type:        'training',
    shadowHint:  'Cerberus',
    icon:        'arm-flex',
    color:       '#ef4444',
  },
]

type EventWindow = {
  name:  string
  start: string // MM-DD
  end:   string // MM-DD
}

type EventBossDef = {
  id:            string
  label:         string
  detail:        string
  type:          Quest['type']
  gpsTarget?:    number
  focusDuration?: number
  shadowHint:    string
  icon:          string
  color:         string
  event:         EventWindow
  required:      number
}

const EVENT_BOSS_DEFS: EventBossDef[] = [
  {
    id: 'event_halloween_reaper',
    label: 'Ceifador de Outono',
    detail: 'Evento Halloween — 90 min de foco absoluto em silêncio total.',
    type: 'focus',
    focusDuration: 90 * 60_000,
    shadowHint: 'soul_reaper',
    icon: 'ghost',
    color: '#f97316',
    event: { name: 'HALLOWEEN', start: '10-24', end: '10-31' },
    required: 6,
  },
  {
    id: 'event_winter_lich',
    label: 'Arquilich do Solstício',
    detail: 'Evento Inverno — 100 min de foco profundo em estudo denso.',
    type: 'focus',
    focusDuration: 100 * 60_000,
    shadowHint: 'archlich_prime',
    icon: 'snowflake',
    color: '#60a5fa',
    event: { name: 'SOLSTÍCIO DE INVERNO', start: '12-20', end: '12-27' },
    required: 6,
  },
  {
    id: 'event_summer_titan',
    label: 'Titã Solar',
    detail: 'Evento Verão — 140 reps em treino contínuo (sem pausas longas).',
    type: 'training',
    shadowHint: 'auto_titan',
    icon: 'weather-sunny',
    color: '#f59e0b',
    event: { name: 'SOLSTÍCIO DE VERÃO', start: '07-01', end: '07-07' },
    required: 5,
  },
  {
    id: 'event_new_year_ashen',
    label: 'Fénix das Cinzas',
    detail: 'Evento Ano Novo — 80 min de foco para reescrever o teu destino.',
    type: 'focus',
    focusDuration: 80 * 60_000,
    shadowHint: 'ash_specter',
    icon: 'fire',
    color: '#f97316',
    event: { name: 'ANO NOVO', start: '01-01', end: '01-07' },
    required: 5,
  },
  {
    id: 'event_valentine_oath',
    label: 'Voto Rubro',
    detail: 'Evento Valentim — 60 min de foco e 60 min de dedicação física.',
    type: 'training',
    shadowHint: 'astral_wisp',
    icon: 'star',
    color: '#fb7185',
    event: { name: 'VALENTIM', start: '02-10', end: '02-16' },
    required: 4,
  },
  {
    id: 'event_carnival_mask',
    label: 'Máscara do Caos',
    detail: 'Evento Carnaval — 6 km de marcha rápida entre distrações.',
    type: 'gps',
    gpsTarget: 6,
    shadowHint: 'astral_echo',
    icon: 'star',
    color: '#a855f7',
    event: { name: 'CARNAVAL', start: '02-28', end: '03-06' },
    required: 5,
  },
  {
    id: 'event_equinox_guardian',
    label: 'Guardião do Equinócio',
    detail: 'Evento Equinócio — 90 min de foco equilibrado sem quebras.',
    type: 'focus',
    focusDuration: 90 * 60_000,
    shadowHint: 'astral_guardian',
    icon: 'shield-check',
    color: '#22c55e',
    event: { name: 'EQUINÓCIO', start: '03-19', end: '03-25' },
    required: 6,
  },
  {
    id: 'event_easter_hare',
    label: 'Lebre do Sistema',
    detail: 'Evento Páscoa — 7 km em ritmo estável e 70 reps rápidas.',
    type: 'gps',
    gpsTarget: 7,
    shadowHint: 'wolf_pup',
    icon: 'star-circle-outline',
    color: '#facc15',
    event: { name: 'PÁSCOA', start: '03-27', end: '04-02' },
    required: 4,
  },
  {
    id: 'event_spring_bloom',
    label: 'Flor da Renascença',
    detail: 'Evento Primavera — 75 min de foco com estudo leve e contínuo.',
    type: 'focus',
    focusDuration: 75 * 60_000,
    shadowHint: 'mud_elemental',
    icon: 'feather',
    color: '#34d399',
    event: { name: 'PRIMAVERA', start: '04-15', end: '04-21' },
    required: 4,
  },
  {
    id: 'event_harvest_king',
    label: 'Rei da Colheita',
    detail: 'Evento Colheita — 150 reps de treino com cadência perfeita.',
    type: 'training',
    shadowHint: 'hollow_peasant',
    icon: 'trophy',
    color: '#f59e0b',
    event: { name: 'COLHEITA', start: '09-15', end: '09-21' },
    required: 6,
  },
  {
    id: 'event_black_friday_merchant',
    label: 'Mercador da Sombra',
    detail: 'Evento Black Friday — 90 min de foco em tarefas económicas/planeamento.',
    type: 'focus',
    focusDuration: 90 * 60_000,
    shadowHint: 'auto_omega',
    icon: 'cash-multiple',
    color: '#0ea5e9',
    event: { name: 'BLACK FRIDAY', start: '11-22', end: '11-28' },
    required: 4,
  },
  {
    id: 'event_yule_seraph',
    label: 'Serafim do Yule',
    detail: 'Evento Yule — 100 min de foco em silêncio com luz baixa.',
    type: 'focus',
    focusDuration: 100 * 60_000,
    shadowHint: 'god_seraphim',
    icon: 'star',
    color: '#93c5fd',
    event: { name: 'YULE', start: '12-24', end: '12-31' },
    required: 6,
  },
  {
    id: 'event_midnight_wraith',
    label: 'Wraith da Meia-Noite',
    detail: 'Evento Noites Longas — 80 min de foco após as 00:00.',
    type: 'focus',
    focusDuration: 80 * 60_000,
    shadowHint: 'death_wraith',
    icon: 'skull',
    color: '#64748b',
    event: { name: 'NOITES LONGAS', start: '11-01', end: '11-07' },
    required: 4,
  },
  {
    id: 'event_festival_drake',
    label: 'Drake do Festival',
    detail: 'Evento Festival — 10 km de marcha e 120 reps no total.',
    type: 'gps',
    gpsTarget: 10,
    shadowHint: 'shadow_dragon',
    icon: 'flag',
    color: '#f97316',
    event: { name: 'FESTIVAL', start: '08-10', end: '08-16' },
    required: 5,
  },
]

function mdToDayIndex(mmdd: string): number {
  const [m, d] = mmdd.split('-').map(n => parseInt(n, 10))
  // Use a non-leap year for stable indexing
  const base = new Date(2001, m - 1, d)
  const start = new Date(2001, 0, 1)
  return Math.floor((base.getTime() - start.getTime()) / 86_400_000)
}

function isDateInWindow(now: Date, start: string, end: string): boolean {
  const nowIdx = mdToDayIndex(`${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)
  const startIdx = mdToDayIndex(start)
  const endIdx = mdToDayIndex(end)
  if (endIdx >= startIdx) return nowIdx >= startIdx && nowIdx <= endIdx
  // Window spans year end
  return nowIdx >= startIdx || nowIdx <= endIdx
}

function getActiveEventBossMissions(now = new Date()): DungeonMission[] {
  return EVENT_BOSS_DEFS
    .filter(def => isDateInWindow(now, def.event.start, def.event.end))
    .map(def => ({
      id: def.id,
      label: def.label,
      detail: `${def.detail} [${def.event.name}]`,
      type: def.type,
      gpsTarget: def.gpsTarget,
      focusDuration: def.focusDuration,
      shadowHint: def.shadowHint,
      icon: def.icon,
      color: def.color,
      eventName: def.event.name,
      eventKey: `${def.id}-${now.getFullYear()}`,
      isEventBoss: true,
    }))
}

const EVENT_TRIAL_TEMPLATES: Array<{
  key: string
  label: string
  type: Quest['type']
  minutes?: number
  km?: number
  reps?: number
}> = [
  { key: 'focus_ritual', label: 'Ritual de Foco', type: 'focus', minutes: 45 },
  { key: 'focus_vow', label: 'Voto de Silêncio', type: 'focus', minutes: 60 },
  { key: 'gps_pilgrimage', label: 'Peregrinação', type: 'gps', km: 5 },
  { key: 'training_burst', label: 'Explosão Física', type: 'training', reps: 120 },
  { key: 'gps_march', label: 'Marcha Ritual', type: 'gps', km: 7 },
  { key: 'focus_sigil', label: 'Selo Mental', type: 'focus', minutes: 75 },
  { key: 'training_endurance', label: 'Resistência', type: 'training', reps: 150 },
]

function buildEventTrials(def: EventBossDef, now = new Date()): DungeonMission[] {
  const eventKey = `${def.id}-${now.getFullYear()}`
  return EVENT_TRIAL_TEMPLATES.map((t, idx) => ({
    id: `trial_${def.id}_${t.key}`,
    label: `${t.label} ${idx + 1}`,
    detail: `${def.event.name} — ${t.type === 'focus'
      ? `${t.minutes} min de foco absoluto`
      : t.type === 'gps'
        ? `${t.km} km em marcha contínua`
        : `${t.reps} reps sem pausas longas`}`,
    type: t.type,
    gpsTarget: t.km,
    focusDuration: t.minutes ? t.minutes * 60_000 : undefined,
    shadowHint: def.shadowHint,
    icon: t.type === 'focus' ? 'timer-outline' : t.type === 'gps' ? 'run-fast' : 'arm-flex',
    color: t.type === 'focus' ? C.neonBlue : t.type === 'gps' ? C.green : C.neonRed,
    eventName: def.event.name,
    eventKey,
    isEventTrial: true,
  }))
}

function GPSTrackerModal({ quest, onClose, onComplete }: {
  quest: Quest; onClose: () => void; onComplete: () => void
}) {
  const target  = quest.gpsTarget ?? 1.5
  const record  = useGameStore(s => s.questRecords[quest.id])
  const saveRec = useGameStore(s => s.saveQuestRecord)
  const timerStore = useGameStore(s => s.activeMissionTimers[quest.id])
  const startT = useGameStore(s => s.startMissionTimer)
  const pauseT = useGameStore(s => s.pauseMissionTimer)
  const clearT = useGameStore(s => s.clearMissionTimer)

  const [elapsed, setElapsed] = useState(
    timerStore ? (timerStore.accumulatedMs + (timerStore.isPaused ? 0 : Date.now() - timerStore.startTime)) : 0
  )
  const [running, setRunning] = useState(!timerStore?.isPaused && !!timerStore)
  const [note, setNote] = useState(record?.lastNote ?? '')

  const tracker = useLocationTracker(target, () => {
    // Only auto-complete if timer is also running or not required?
    // User said "o gps so conta quando o timer tmb estiver a contar"
    // So if GPS target reached, we can auto-complete.
    // Vibration handled by completeQuest/modal
    handleFinalize()
  })

  // Control distance accumulation based on timer
  useEffect(() => {
    if (running && !tracker.isTracking) {
      tracker.startTracking()
    } else if (!running && tracker.isTracking) {
      tracker.stopTracking()
    }
  }, [running])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (running) {
      const startTime = Date.now() - elapsed
      interval = setInterval(() => {
        setElapsed(Date.now() - startTime)
      }, 500)
      tracker.startTracking()
    } else {
      tracker.stopTracking()
    }
    return () => {
      if (interval) clearInterval(interval)
      tracker.stopTracking()
    }
  }, [running])

  // Persistent store sync
  useEffect(() => {
    if (!timerStore) {
      startT(quest.id)
      setRunning(true)
    }
  }, [])

  function togglePause() {
    if (running) {
      pauseT(quest.id)
      setRunning(false)
    } else {
      startT(quest.id)
      setRunning(true)
    }
  }

  function handleFinalize() {
    tracker.stopTracking()
    clearT(quest.id)
    saveRec(quest.id, Math.floor(elapsed / 1000), note.trim())
    onComplete()
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={gm.overlay}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, width: '100%' }}>
        <View style={gm.card}>
          <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="run-fast" size={16} color={C.green} />
              <Text style={gm.title}> GPS TRACKER</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={20} color={C.dimmed} />
            </TouchableOpacity>
          </View>
          
          <Text style={gm.subtitle}>{quest.label}</Text>

          <View style={gm.timerBox}>
             <Text style={gm.timerText}>{formatTime(elapsed)}</Text>
             <Text style={gm.timerSub}>{running ? 'em movimento…' : 'pausado'}</Text>
          </View>

          {tracker.error ? (
            <Text style={gm.error}>{tracker.error}</Text>
          ) : (
            <>
              <Text style={gm.dist}>
                {tracker.distKm.toFixed(2)}
                <Text style={gm.distUnit}> / {target} km</Text>
              </Text>
              <View style={gm.track}>
                <View style={[gm.fill, { width: `${tracker.pct}%` as any }]} />
              </View>
              
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <TouchableOpacity 
                   style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: running ? C.gold + '22' : C.green + '22', borderWidth: 1, borderColor: running ? C.gold : C.green, padding: 12, borderRadius: 4 }}
                   onPress={togglePause}
                >
                  <Icon name={running ? 'pause' : 'play'} size={16} color={running ? C.gold : C.green} />
                  <Text style={{ color: running ? C.gold : C.green, fontFamily: FONT.orbitron, fontSize: 10, marginLeft: 8 }}>
                    {running ? 'PAUSAR' : (elapsed > 1000 ? 'RETOMAR' : 'INICIAR')}
                  </Text>
                </TouchableOpacity>
              </View>

              {!tracker.isTracking && running && (
                <View style={gm.warnRow}>
                  <Icon name="satellite-variant" size={12} color={C.muted} />
                  <Text style={[gm.warn, { color: C.muted }]}> A obter sinal GPS...</Text>
                </View>
              )}
              {tracker.cheating && (
                <View style={gm.warnRow}>
                  <Icon name="speedometer" size={12} color={C.neonRed} />
                  <Text style={gm.warn}> Velocidade elevada! Distância pausada.</Text>
                </View>
              )}
            </>
          )}

          <View style={{ width: '100%', marginBottom: 20 }}>
             <Text style={{ color: C.dimmed, fontSize: 9, fontFamily: FONT.orbitron, marginBottom: 6 }}>NOTAS DE CAMPO</Text>
             <TextInput 
                style={{ backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 8, color: '#fff', fontSize: 12, minHeight: 60 }}
                placeholder="Regista o teu progresso..."
                placeholderTextColor={C.dimmed}
                multiline
                value={note}
                onChangeText={setNote}
             />
          </View>

          <TouchableOpacity style={[gm.completeBtn, { width: '100%', backgroundColor: C.green, paddingVertical: 14 }]} onPress={handleFinalize}>
            <Icon name="check-bold" size={16} color={C.bg} />
            <Text style={{ color: C.bg, fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '900', marginLeft: 8 }}>TERMINAR MISSÃO</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Quest Card ─────────────────────────────────────────────────────────────────

function QuestCard({ quest, isExtra }: { quest: Quest; isExtra?: boolean }) {
  const completeQuest       = useGameStore(s => isExtra ? s.completeExtraQuest : s.completeQuest)
  // Use a stable identity for the no-op function
  const undoQuest           = useGameStore(s => isExtra ? undefined : s.undoQuest)
  const recordFocus         = useGameStore(s => s.recordFocusTime)
  const questRecords        = useGameStore(s => s.questRecords)
  const activeMissionTimers = useGameStore(s => s.activeMissionTimers)
  const failQuest           = useGameStore(s => s.failQuest)
  const updateQuestValue    = useGameStore(s => s.updateQuestValue)

  const timer = activeMissionTimers[quest.id]
  const isTimerActive = !!timer && !quest.done

  const [showGPS,        setShowGPS]        = useState(false)
  const [showMission,    setShowMission]    = useState(false)
  const [confirmUndo,    setConfirmUndo]    = useState(false)

  const cfg    = QUEST_CONFIG[quest.type]
  const record = questRecords[quest.id]

  function handleComplete() {
    const { leveledUp } = completeQuest(quest.id)
    // Removed redundant vibration (handled in store)
  }

  function handleMissionComplete() {
    setShowMission(false)
    if (quest.type === 'focus') {
      const focusMinutes = Math.max(1, Math.round((quest.focusDuration ?? 30 * 60_000) / 60_000))
      recordFocus(focusMinutes)
    }
    handleComplete()
  }

  const Container = (quest.done ? View : TouchableOpacity) as React.ElementType

  return (
    <Container 
      style={[qc.card, quest.done && qc.cardDone, isTimerActive && qc.cardActive]}
      activeOpacity={0.8}
      onPress={!quest.done ? () => {
        if (quest.type === 'gps') setShowGPS(true)
        else if (quest.type === 'forbidden' || quest.type === 'limit') { /* handled via inline buttons or state */ }
        else setShowMission(true)
      } : undefined}
    >
      <View style={qc.header}>
        <View style={[qc.typeTag, { borderColor: cfg.color + '55' }]}>
          <Icon name={cfg.icon} size={14} color={quest.done ? C.muted : cfg.color} />
        </View>
        <Text style={[qc.label, quest.done && qc.labelDone]} numberOfLines={1}>{quest.label}</Text>
        <View style={qc.rewards}>
          {isExtra && (
            <View style={s.extraBonusBadge}>
              <Text style={s.extraBonusTxt}>×1.5</Text>
            </View>
          )}
          <Icon name="star-four-points" size={10} color={quest.done ? C.dimmed : (isExtra ? C.gold : C.neonBlue)} />
          <Text style={[qc.xp, quest.done && qc.dimmedTxt, isExtra && { color: C.gold }]}> {quest.xp}</Text>
          <Text style={[qc.gold, quest.done && qc.dimmedTxt, isExtra && { color: C.gold }]}>  ◈{quest.gold}</Text>
        </View>
      </View>

      <Text style={[qc.detail, quest.done && qc.dimmedTxt]}>{quest.detail}</Text>

      {/* Personal record chip */}
      {record && record.bestTime > 0 && !quest.done && (
        <View style={qc.recordChip}>
          <Icon name="trophy-outline" size={10} color={C.gold} />
          <Text style={qc.recordChipTxt}>
            {' '}PR: {Math.floor(record.bestTime / 60).toString().padStart(2, '0')}:{(record.bestTime % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      )}

      {quest.done ? (
        <View style={qc.doneRow}>
          <Icon name="check-circle" size={14} color={C.green} />
          <Text style={qc.doneTag}> CONCLUÍDA</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={qc.undoBtn} onPress={() => setConfirmUndo(true)}>
            <Icon name="undo-variant" size={13} color={C.muted} />
            <Text style={qc.undoTxt}> DESFAZER</Text>
          </TouchableOpacity>
        </View>
      ) : quest.type === 'forbidden' ? (
        <View style={qc.forbiddenRow}>
          <TouchableOpacity style={qc.failBtn} onPress={() => failQuest(quest.id)}>
            <Icon name="close-circle-outline" size={14} color={C.neonRed} />
            <Text style={qc.failBtnTxt}> FALHEI</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <Text style={qc.forbiddenStatus}>[ EM VIGOR ]</Text>
        </View>
      ) : quest.type === 'limit' ? (
        <View style={qc.limitRow}>
          <View style={qc.limitControls}>
             <TouchableOpacity onPress={() => updateQuestValue(quest.id, Math.max(0, (quest.currentValue ?? 0) - 10))}>
               <Icon name="minus-box-outline" size={20} color={C.dimmed} />
             </TouchableOpacity>
             <Text style={qc.limitValue}>{(quest.currentValue ?? 0).toString()}</Text>
             <TouchableOpacity onPress={() => updateQuestValue(quest.id, (quest.currentValue ?? 0) + 10)}>
               <Icon name="plus-box-outline" size={20} color={C.neonBlue} />
             </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={[qc.limitStatus, (quest.currentValue ?? 0) > (quest.targetValue ?? 0) ? { color: C.neonRed } : { color: C.green }]}>
            MAX: {quest.targetValue}
          </Text>
        </View>
      ) : isTimerActive ? (
        <View style={qc.activeTimerRow}>
          <Icon name="timer-outline" size={13} color={C.neonBlue} />
          <Text style={qc.activeTimerTxt}> A DECORRER</Text>
          <View style={{ flex: 1 }} />
          <Icon name="chevron-right" size={14} color={C.neonBlue} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, opacity: 0.5 }}>
           <Icon name="gesture-tap" size={14} color={C.neonBlue} />
           <Text style={{ color: C.neonBlue, fontSize: 10, fontFamily: FONT.orbitron, marginLeft: 4 }}>
             TOCA PARA INICIAR
           </Text>
        </View>
      )}

      {showGPS && (
        <GPSTrackerModal
          quest={quest}
          onClose={() => setShowGPS(false)}
          onComplete={() => { setShowGPS(false); handleComplete() }}
        />
      )}

      {showMission && (
        <MissionActiveScreen
          quest={quest}
          onClose={() => setShowMission(false)}
          onComplete={handleMissionComplete}
          initialElapsed={timer ? (timer.accumulatedMs + (timer.isPaused ? 0 : Date.now() - timer.startTime)) : 0}
          initialPaused={timer?.isPaused}
          targetSeconds={quest.type === 'focus' ? (quest.focusDuration ? quest.focusDuration / 1000 : 30 * 60) : undefined}
        />
      )}

      <CustomModal
        visible={confirmUndo}
        title="DESFAZER MISSÃO"
        message={`Reverter a conclusão de "${quest.label}"?\nO XP e Gold ganhos serão deduzidos.`}
        confirmLabel="DESFAZER"
        confirmIcon="undo-variant"
        confirmColor={C.neonRed}
        onConfirm={() => { setConfirmUndo(false); undoQuest?.(quest.id) }}
        onCancel={() => setConfirmUndo(false)}
      />
    </Container>
  )
}

// ── Weekly Dungeon Modal ──────────────────────────────────────────────────────
function WeeklyDungeonModal({ visible, onClose, onRequestClose, onSelectMission, customMissions, defeatedId }: {
  visible: boolean; onClose: () => void; onRequestClose?: () => void; onSelectMission: (m: DungeonMission) => void; 
  customMissions: DungeonMission[]; defeatedId?: string
}) {
  const weeklyMissions = customMissions.length > 0 ? [...customMissions] : DUNGEON_MISSIONS
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onRequestClose}>
      <View style={dm.overlay}>
        <View style={dm.card}>
          <Icon name="gate" size={40} color={C.neonRed} style={{ marginBottom: SPACING.sm }} />
          <Text style={dm.warning}>⚠ ALERTA DO SISTEMA ⚠</Text>
          <Text style={dm.title}>[ PORTÕES VERMELHOS SEMANAIS ]</Text>
          <Text style={dm.sub}>
            Completa uma Missão de Boss para ganhares XP, Gold e extraíres uma Sombra.
          </Text>

          <ScrollView style={{ width: '100%', maxHeight: 400 }} contentContainerStyle={{ alignItems: 'center' }} showsVerticalScrollIndicator={false}>
            {weeklyMissions.map(m => {
              const isDefeated = defeatedId === m.shadowHint
              const isLocked = !!defeatedId && !isDefeated

              return (
                <TouchableOpacity
                  key={m.id}
                  style={[dm.missionBtn, isDefeated && { borderColor: C.green + '88' }, isLocked && { opacity: 0.3 }]}
                  onPress={() => { if (!isLocked) { onClose(); onSelectMission(m); } }}
                  disabled={isLocked}
                >
                  <View style={[dm.missionIcon, { backgroundColor: m.color + '22', borderColor: m.color + '66', borderWidth: 1 }]}>
                    <Icon name={m.icon} size={20} color={m.color} />
                  </View>
                  <View style={dm.missionInfo}>
                    <Text style={[dm.missionLabel, { color: m.color }]}>
                      {isDefeated ? '[ BOSS DERROTADO ]' : m.label}
                    </Text>
                    <Text style={dm.missionDetail}>{m.detail}</Text>
                    {!isDefeated && (
                      <View style={dm.shadowExtractTag}>
                        <Icon name="ghost" size={9} color={C.purple} />
                        <Text style={dm.shadowExtractTxt}>
                          {' '}Sombra: {m.customShadow?.name ?? (SHADOW_MAP[m.shadowHint]?.name ?? m.shadowHint)}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          <TouchableOpacity style={dm.cancelBtn} onPress={onClose}>
            <Text style={dm.cancelTxt}>RECUAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

function EventDungeonModal({ visible, onClose, onRequestClose, onSelectMission, eventTrials, eventBossMission, eventProgress }: {
  visible: boolean; onClose: () => void; onRequestClose?: () => void; onSelectMission: (m: DungeonMission) => void;
  eventTrials: DungeonMission[]; eventBossMission: DungeonMission | null;
  eventProgress: { completedIds: string[]; required: number; defeated: boolean } | null
}) {
  if (!eventProgress) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onRequestClose}>
      <View style={dm.overlay}>
        <View style={dm.card}>
          <Icon name="calendar-star" size={40} color="#f97316" style={{ marginBottom: SPACING.sm }} />
          <Text style={[dm.warning, { color: '#f97316' }]}>⚠ EVENTO LIMITADO ⚠</Text>
          <Text style={[dm.title, { color: '#fbbf24' }]}>[ MASMORRA ESPECIAL DE EVENTO ]</Text>

          <View style={dm.eventHeader}>
            <Text style={dm.eventHeaderTxt}>PROVAS DO EVENTO</Text>
          </View>
          <Text style={dm.eventProgressTxt}>
            Progresso: {eventProgress.completedIds.length}/{eventProgress.required} provas completas
          </Text>

          <ScrollView style={{ width: '100%', maxHeight: 380 }} contentContainerStyle={{ alignItems: 'center' }} showsVerticalScrollIndicator={false}>
            {eventTrials.map(m => {
              const completed = eventProgress.completedIds.includes(m.id)
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[dm.missionBtn, { borderColor: m.color + '88', opacity: completed ? 0.3 : 1 }]}
                  onPress={() => { if (!completed) { onClose(); onSelectMission(m) } }}
                  activeOpacity={0.7}
                >
                  <View style={[dm.missionIcon, { backgroundColor: m.color + '22', borderColor: m.color + '66', borderWidth: 1 }]}>
                    <Icon name={m.icon} size={20} color={m.color} />
                  </View>
                  <View style={dm.missionInfo}>
                    <Text style={[dm.missionLabel, { color: m.color }]}>
                      {completed ? '[ PROVA COMPLETA ]' : m.label}
                    </Text>
                    <Text style={dm.missionDetail}>{m.detail}</Text>
                  </View>
                  <Icon name={completed ? "check-circle" : "chevron-right"} size={18} color={completed ? C.green : m.color} />
                </TouchableOpacity>
              )
            })}

            <View style={[dm.eventHeader, { marginTop: SPACING.md }]}>
              <Text style={dm.eventHeaderTxt}>BOSS FINAL DO EVENTO</Text>
            </View>

            {eventBossMission ? (
              <TouchableOpacity
                style={[dm.missionBtn, { borderColor: eventBossMission.color + '88', opacity: eventProgress.defeated ? 0.3 : 1 }]}
                onPress={() => { if (!eventProgress.defeated) { onClose(); onSelectMission(eventBossMission) } }}
                activeOpacity={0.7}
              >
                <View style={[dm.missionIcon, { backgroundColor: eventBossMission.color + '22', borderColor: eventBossMission.color + '66', borderWidth: 1 }]}>
                  <Icon name={eventBossMission.icon} size={20} color={eventBossMission.color} />
                </View>
                <View style={dm.missionInfo}>
                  <Text style={[dm.missionLabel, { color: eventBossMission.color }]}>
                    {eventProgress.defeated ? '[ EVENTO CONCLUÍDO ]' : eventBossMission.label}
                  </Text>
                  <Text style={dm.missionDetail}>{eventBossMission.detail}</Text>
                  {!eventProgress.defeated && (
                    <View style={dm.shadowExtractTag}>
                      <Icon name="ghost" size={9} color={C.purple} />
                      <Text style={dm.shadowExtractTxt}>
                        {' '}Sombra: {SHADOW_MAP[eventBossMission.shadowHint!]?.name ?? eventBossMission.shadowHint ?? 'Desconhecida'}
                      </Text>
                    </View>
                  )}
                </View>
                <Icon name={eventProgress.defeated ? "check-circle" : "chevron-right"} size={18} color={eventProgress.defeated ? C.green : eventBossMission.color} />
              </TouchableOpacity>
            ) : (
              <Text style={dm.eventLockedTxt}>
                Completa as provas acima para desbloquear o Boss do evento.
              </Text>
            )}
          </ScrollView>

          <TouchableOpacity style={dm.cancelBtn} onPress={onClose}>
            <Text style={dm.cancelTxt}>RECUAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Boss Victory Modal ─────────────────────────────────────────────────────────

function BossVictoryModal({ visible, onClose, onRequestClose, info }: {
  visible: boolean; onClose: () => void; onRequestClose?: () => void; info: { xp: number; gold: number; shadowName?: string; leveledUpShadow?: boolean }
}) {
  useEffect(() => { Vibration.vibrate([0, 100, 50, 300, 50, 500]) }, [])

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onRequestClose}>
      <View style={bv.overlay}>
        <View style={bv.card}>
          <Icon name="sword" size={48} color={C.gold} style={{ marginBottom: SPACING.sm }} />
          <Text style={bv.header}>BOSS DERROTADO!</Text>
          <Text style={bv.sub}>O dungeon foi limpo. O Sistema reconhece a tua força.</Text>

          <View style={bv.rewardsBox}>
            <View style={bv.rewardRow}>
              <Icon name="star-four-points" size={16} color={C.neonBlue} />
              <Text style={bv.rewardTxt}> +{info.xp} XP</Text>
            </View>
            <View style={bv.rewardRow}>
              <Icon name="rhombus" size={16} color={C.gold} />
              <Text style={bv.rewardTxt}> +{info.gold} Gold</Text>
            </View>
            {info.shadowName && (
              <View style={[bv.rewardRow, { marginTop: SPACING.sm }]}>
                <Icon name="ghost" size={16} color="#a855f7" />
                <Text style={[bv.rewardTxt, { color: '#a855f7' }]}>
                  {info.leveledUpShadow
                    ? ` ${info.shadowName} subiu de nível!`
                    : ` Sombra obtida: ${info.shadowName}`}
                </Text>
              </View>
            )}
          </View>

          {!info.shadowName && (
            <Text style={bv.shadowHint}>Atinge o nível 10 para receber Sombras de boss raids.</Text>
          )}

          <TouchableOpacity style={bv.btn} onPress={onClose}>
            <Text style={bv.btnTxt}>CONTINUAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function QuestScreen() {
  const quests               = useGameStore(s => s.quests)
  const hasPenalty           = useGameStore(s => s.system.hasPenalty)
  const penaltyQ             = useGameStore(s => s.system.penaltyQuests)
  const xpBoostNext          = useGameStore(s => s.system.xpBoostNext)
  const bossDefeatedThisWeek = useGameStore(s => s.system.bossDefeatedThisWeek)
  const weeklyDefeatedBossId = useGameStore(s => s.system.weeklyDefeatedBossId)
  const defeatBoss           = useGameStore(s => s.defeatDungeonBoss)
  const recordFocus          = useGameStore(s => s.recordFocusTime)
  const triggerEvent         = useGameStore(s => s.triggerEvent)
  const questDictionary      = useGameStore(s => s.questDictionary)
  const updateSettings       = useGameStore(s => s.updateSettings)
  const activeRaidBoss       = useGameStore(s => s.system.activeRaidBoss)

  const regenerateDailyQuests = useGameStore(s => s.regenerateDailyQuests)
  const weeklyRegenCount      = useGameStore(s => s.system.weeklyRegenCount)
  const [showRegen, setShowRegen] = React.useState(false)
  const [regenResult, setRegenResult] = React.useState<{ success: boolean; reason?: string } | null>(null)

  function handleRegenerate() {
    const result = regenerateDailyQuests()
    setRegenResult(result)
  }

  // Custom boss missions filtered by weekly rotation
  const weeklyBossIds        = useGameStore(s => s.system.weeklyBossIds || [])
  const eventBossKey         = useGameStore(s => s.system.eventBossKey)
  const eventBossCompletedIds = useGameStore(s => s.system.eventBossCompletedIds)
  const eventBossRequired    = useGameStore(s => s.system.eventBossRequired)
  const eventBossDefeated    = useGameStore(s => s.system.eventBossDefeated)
  const setEventBossState    = useGameStore(s => s.setEventBossState)
  const completeEventTrial   = useGameStore(s => s.completeEventTrial)
  const markEventBossDefeated = useGameStore(s => s.markEventBossDefeated)
  const customBossMissions: DungeonMission[] = questDictionary
    .filter(def => def.type === 'boss' && weeklyBossIds.includes(def.id))
    .map(def => ({
      id:           `custom_boss_${def.id}`,
      label:        def.title,
      detail:       def.description
        .replace(/{target}/g, String(def.baseTarget))
        .replace(/{unit}/g, def.unit),
      type:         def.questType,
      shadowHint:   def.dropShadowId ?? `custom:${def.id}`,
      icon:         'sword',
      color:        '#f59e0b',
      customShadow: def.dropShadowId ? undefined : (def.shadowName
        ? { name: def.shadowName, icon: def.shadowIcon ?? 'ghost', questType: def.questType }
        : undefined),
    }))
  const eventBossMissions = React.useMemo(() => getActiveEventBossMissions(), [])
  const activeEventDef = React.useMemo(() => 
    EVENT_BOSS_DEFS.find(def => eventBossMissions.some(m => m.id === def.id)),
  [eventBossMissions])
  
  const eventTrials = React.useMemo(() => 
    activeEventDef ? buildEventTrials(activeEventDef) : [],
  [activeEventDef])
  
  const activeEventKey = React.useMemo(() => 
    activeEventDef ? `${activeEventDef.id}-${new Date().getFullYear()}` : '',
  [activeEventDef])

  const eventCompleted = (activeEventKey && eventBossKey === activeEventKey) ? eventBossCompletedIds : []
  const eventRequired = activeEventDef?.required ?? 0
  const eventUnlocked = activeEventDef ? eventCompleted.length >= eventRequired : false
  const eventBossMission = (activeEventDef && eventUnlocked)
    ? eventBossMissions.find(m => m.id === activeEventDef.id) ?? null
    : null

  const extraQuests          = useGameStore(s => s.extraQuests)
  const generateExtraQuests  = useGameStore(s => s.generateExtraQuests)
  const completeExtraQuest   = useGameStore(s => s.completeExtraQuest)

  const done  = quests.filter(q => q.done).length
  const total = quests.length
  const allDailyDone = done === total && total > 0

  const dayOfWeek = new Date().getDay()
  const isRestDay = useGameStore(s => s.settings.restDay)
  const isBossDay = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0  // Fri/Sat/Sun

  const [showDungeon,     setShowDungeon]     = useState(false)
  const [showEventDungeon, setShowEventDungeon] = useState(false)
  const [showForge,       setShowForge]       = useState(false)
  const [activeMission,   setActiveMission]   = useState<DungeonMission | null>(null)
  const [confirmBossTraining, setConfirmBossTraining] = useState(false)
  const [victoryInfo,     setVictoryInfo]     = useState<{ xp: number; gold: number; shadowName?: string; leveledUpShadow?: boolean } | null>(null)
  const [eventProgressInfo, setEventProgressInfo] = useState<{ name: string; completed: number; required: number } | null>(null)

  useEffect(() => {
    if (!activeEventDef || !activeEventKey) return
    // Only reset/initialize if the key actually changed
    // Use a ref or the current state from store to compare
    if (eventBossKey !== activeEventKey) {
      console.log('[QuestScreen] Event key changed, updating boss state:', activeEventKey);
      setEventBossState(activeEventKey, activeEventDef.required, eventTrials.length)
    }
  }, [activeEventKey, activeEventDef?.required, eventTrials.length, eventBossKey, setEventBossState])

  useEffect(() => {
    const onBackPress = () => {
      if (activeMission) {
        setActiveMission(null)
        setConfirmBossTraining(false)
        return true
      }
      if (showEventDungeon) {
        setShowEventDungeon(false)
        return true
      }
      if (showDungeon) {
        setShowDungeon(false)
        return true
      }
      if (showForge) {
        setShowForge(false)
        return true
      }
      return false
    }
    BackHandler.addEventListener('hardwareBackPress', onBackPress)
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress)
  }, [activeMission, showEventDungeon, showDungeon, showForge])

  function handleMissionSelect(m: DungeonMission) {
    setActiveMission(m)
    if (m.type === 'training') setConfirmBossTraining(true)
  }

  function completeBossMission(m: DungeonMission, focusMinutes?: number) {
    setActiveMission(null)
    if (m.isEventTrial && m.eventKey) {
      if (focusMinutes) recordFocus(focusMinutes)
      const res = completeEventTrial(m.id, m.eventKey, eventRequired, eventTrials.length)
      setEventProgressInfo({ name: m.eventName ?? 'EVENTO', completed: res.completed, required: res.required })
      return
    }
    if (focusMinutes) recordFocus(focusMinutes)
    const result = defeatBoss(m.shadowHint, m.customShadow)
    setVictoryInfo(result)
    // Fire boss-specific achievement triggers alongside the generic boss_defeated.
    // For fixed missions use m.id directly; for custom bosses strip the prefix so
    // the missionId matches the quest definition id used in evaluateAchievementCondition.
    const missionId = m.id.startsWith('custom_boss_') ? m.id.slice('custom_boss_'.length) : m.id
    if (m.id === 'boss_gps'   || (m.id.startsWith('custom_boss_') && m.type === 'gps') || (m.isEventBoss && m.type === 'gps'))
      triggerEvent('boss_gps_completed',      { missionId })
    if (m.id === 'boss_focus' || (m.id.startsWith('custom_boss_') && m.type === 'focus') || (m.isEventBoss && m.type === 'focus'))
      triggerEvent('boss_focus_completed',    { missionId })
    if (m.id === 'boss_training' || (m.id.startsWith('custom_boss_') && m.type === 'training') || (m.isEventBoss && m.type === 'training'))
      triggerEvent('boss_training_completed', { missionId })
    if (m.isEventBoss && m.eventKey) {
      markEventBossDefeated(m.eventKey)
    }
  }

  // Convert active dungeon mission to Quest shape for existing tracker modals
  const activeBossQuest: Quest | null = activeMission ? {
    id:            activeMission.id,
    label:         activeMission.label,
    detail:        activeMission.detail,
    xp:            0,
    gold:          0,
    type:          activeMission.type,
    done:          false,
    gpsTarget:     activeMission.gpsTarget,
    focusDuration: activeMission.focusDuration,
  } : null

  return (
    <View style={s.safeArea}>
      <ScrollView contentContainerStyle={s.content}>

        {/* ── GLOBAL RAID BOSS ── */}
        {activeRaidBoss && (() => {
          const def = RAID_BOSSES.find(b => b.id === activeRaidBoss.defId)
          if (!def) return null
          const progress = activeRaidBoss.currentHp / activeRaidBoss.maxHp
          const timeLeftMs = activeRaidBoss.endDate - Date.now()
          const daysLeft = Math.max(0, Math.floor(timeLeftMs / (1000 * 60 * 60 * 24)))
          const hrsLeft = Math.max(0, Math.floor((timeLeftMs / (1000 * 60 * 60)) % 24))

          return (
            <View style={{ marginBottom: 20, padding: 12, backgroundColor: def.color + '15', borderWidth: 1, borderColor: def.color + '50', borderRadius: 8 }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                 <Icon name={def.icon} size={24} color={def.color} style={{ marginRight: 10 }} />
                 <View style={{ flex: 1 }}>
                   <Text style={{ fontFamily: FONT.orbitron, fontSize: 10, color: def.color, letterSpacing: 1 }}>RAID BOSS GLOBAL · RANK {def.rank}</Text>
                   <Text style={{ fontFamily: FONT.orbitron, fontSize: 14, color: '#fff', fontWeight: 'bold', marginTop: 2 }}>{def.name}</Text>
                 </View>
                 <View style={{ alignItems: 'flex-end' }}>
                    <Icon name="timer-sand" size={12} color={C.dimmed} />
                    <Text style={{ fontFamily: FONT.orbitron, fontSize: 9, color: C.dimmed, marginTop: 2 }}>{daysLeft}d {hrsLeft}h</Text>
                 </View>
               </View>
               
               <View style={{ height: 6, backgroundColor: '#000', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                  <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: def.color }} />
               </View>
               
               <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: FONT.orbitron, fontSize: 9, color: C.dimmed }}>HP RESTANTE</Text>
                  <Text style={{ fontFamily: FONT.orbitron, fontSize: 10, color: '#fff' }}>{Math.floor(activeRaidBoss.currentHp)} <Text style={{ fontSize: 9, color: C.dimmed }}>/ {activeRaidBoss.maxHp}</Text></Text>
               </View>
            </View>
          )
        })()}

        <View style={s.titleRow}>
          <Icon name="clipboard-list-outline" size={16} color={C.neonBlue} />
          <Text style={s.title}> MISSÕES DO DIA</Text>
          {isRestDay && (
            <View style={s.restBadge}>
              <Icon name="bed" size={10} color={C.green} />
              <Text style={s.restTxt}> DESCANSO</Text>
            </View>
          )}
        </View>

        {/* Compact tactical action row */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={() => setShowForge(true)} activeOpacity={0.75}>
            <Icon name="hammer-wrench" size={13} color={C.neonBlue} />
            <View>
              <Text style={s.actionBtnTxt}> FORJA</Text>
              <Text style={s.actionBtnSub}>  Cria missões personalizadas</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, isRestDay && { borderColor: C.green + '88', backgroundColor: C.green + '0d' }]}
            onPress={() => updateSettings({ restDay: !isRestDay })}
            activeOpacity={0.75}
          >
            <Icon name="bed" size={13} color={isRestDay ? C.green : C.muted} />
            <View>
              <Text style={[s.actionBtnTxt, { color: isRestDay ? C.green : C.muted }]}>
                {isRestDay ? ' REPOUSO ATIVO' : ' REPOUSO'}
              </Text>
              <Text style={s.actionBtnSub}>  Pausa sem penalidades</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Rest day overlay banner */}
        {isRestDay && (
          <View style={s.restDayBanner}>
            <Icon name="shield-moon" size={16} color={C.green} />
            <Text style={s.restDayBannerTxt}> [ ESTADO: REPOUSO DO MONARCA ]</Text>
          </View>
        )}

        {/* Unified daily status bar */}
        <View style={s.statusBar}>
          <View style={s.statusBarRow}>
            <Text style={s.statusBarLabel}>[ PROGRESSO DE HOJE ]</Text>
            <Text style={[s.statusBarCounter, done === total && total > 0 ? { color: C.green } : {}]}>
              {done}<Text style={s.statusBarSlash}> / </Text>{total}
            </Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, {
              width: `${total > 0 ? (done / total) * 100 : 0}%` as any,
              backgroundColor: done === total && total > 0 ? C.green : C.neonBlue,
            }]} />
          </View>
          {isBossDay && (
            <View style={s.statusBarBossRow}>
              <Icon name="gate" size={9} color={bossDefeatedThisWeek ? C.green : C.neonRed} />
              <Text style={[s.statusBarBossLabel, { color: bossDefeatedThisWeek ? C.green : C.neonRed }]}>
                {bossDefeatedThisWeek ? ' BOSS DERROTADO' : ' BOSS RAID DISPONÍVEL'}
              </Text>
            </View>
          )}
        </View>


        {/* ── SECTION: MISSÕES DIÁRIAS ── */}
        <View style={s.sectionHeaderRow}>
          <View style={[s.sectionDivider, { marginBottom: 0, flex: 1 }]}>
            <View style={s.sectionLine} />
            <Text style={s.sectionLabel}>MISSÕES DIÁRIAS</Text>
            <View style={s.sectionLine} />
          </View>
          <TouchableOpacity 
            style={s.regenBtnInline} 
            onPress={() => setShowRegen(true)}
            activeOpacity={0.7}
          >
            <Icon name="refresh" size={14} color={C.neonBlue} />
            <Text style={s.regenBtnTxt}>{Math.max(0, 3 - weeklyRegenCount)}/3</Text>
          </TouchableOpacity>
        </View>

        {/* XP Boost active indicator */}
        {xpBoostNext && (
          <View style={s.boostBanner}>
            <Icon name="timer-sand-complete" size={12} color="#fbbf24" />
            <Text style={s.boostTxt}> AMPULHETA ATIVA — próxima missão com XP x2</Text>
          </View>
        )}

        {hasPenalty && (
          <View style={s.penalSection}>
            <View style={s.penalHeader}>
              <Icon name="alert-circle" size={12} color={C.neonRed} />
              <Text style={s.penalTitle}> MISSÕES DE PENALIZAÇÃO</Text>
            </View>
            {penaltyQ.map(q => <QuestCard key={q.id} quest={q} />)}
          </View>
        )}

        <View style={isRestDay ? { opacity: 0.45 } : undefined}>
          {quests.map(q => <QuestCard key={q.id} quest={q} />)}
        </View>

        {/* ── SECTION: MISSÕES EXTRA (pool bonus) ── */}
        {allDailyDone && (
          <>
            <View style={[s.sectionDivider, { marginTop: SPACING.sm }]}>
              <View style={[s.sectionLine, { backgroundColor: C.gold + '55' }]} />
              <Text style={[s.sectionLabel, { color: C.gold }]}>MISSÕES EXTRA</Text>
              <View style={[s.sectionLine, { backgroundColor: C.gold + '55' }]} />
            </View>

            <View style={s.extraInfoBox}>
              <Icon name="star-four-points" size={11} color={C.gold} />
              <Text style={s.extraInfoTxt}>
                {' '}Todas as missões diárias concluídas. O Sistema oferece desafios extras com recompensas 1.5×.
              </Text>
            </View>

            {extraQuests.map(q => <QuestCard key={q.id} quest={q} isExtra />)}

            {extraQuests.length < 2 && (
              <TouchableOpacity
                style={s.generateExtraBtn}
                onPress={() => generateExtraQuests()}
                activeOpacity={0.75}
              >
                <Icon name="plus-circle-outline" size={14} color={C.gold} />
                <Text style={s.generateExtraTxt}>
                  {extraQuests.length === 0
                    ? ' GERAR MISSÃO EXTRA'
                    : ' GERAR MAIS UMA MISSÃO EXTRA'}
                </Text>
                <Text style={s.generateExtraSub}> ({2 - extraQuests.length} restante{2 - extraQuests.length !== 1 ? 's' : ''})</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── SECTION: MISSÕES DE BOSS ── */}
        {isBossDay && (
          <>
            <View style={[s.sectionDivider, { marginTop: SPACING.sm }]}>
              <View style={[s.sectionLine, { backgroundColor: C.neonRed + '44' }]} />
              <Text style={[s.sectionLabel, { color: C.neonRed }]}>MISSÕES DE BOSS</Text>
              <View style={[s.sectionLine, { backgroundColor: C.neonRed + '44' }]} />
            </View>

            {!bossDefeatedThisWeek ? (
              <TouchableOpacity style={s.bossBanner} onPress={() => setShowDungeon(true)} activeOpacity={0.8}>
                <View style={s.bossBannerLeft}>
                  <Icon name="gate" size={20} color={C.neonRed} />
                  <View style={{ marginLeft: SPACING.sm }}>
                    <Text style={s.bossTitle}>PORTÃO VERMELHO DETECTADO</Text>
                    <Text style={s.bossSub}>Boss Raid disponível — Entra na Masmorra</Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={18} color={C.neonRed} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.bossDefeatedBanner} onPress={() => setShowDungeon(true)} activeOpacity={0.8}>
                <Icon name="sword" size={14} color={C.green} />
                <Text style={s.bossDefeatedTxt}> MASMORRA LIMPA — Clica para ver detalhes</Text>
              </TouchableOpacity>
            )}

            {activeEventDef && (
              <TouchableOpacity
                style={[s.bossBanner, { marginTop: SPACING.md, borderColor: '#f9731688' }]}
                onPress={() => setShowEventDungeon(true)}
                activeOpacity={0.8}
              >
                <View style={s.bossBannerLeft}>
                  <Icon name="calendar-star" size={20} color="#f97316" />
                  <View style={{ marginLeft: SPACING.sm }}>
                    <Text style={[s.bossTitle, { color: '#fbbf24' }]}>MASMORRA DE EVENTO DETECTADA</Text>
                    <Text style={s.bossSub}>Provas de {activeEventDef.event.name} disponíveis</Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={18} color="#f97316" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Forge button — at end of list so combat is the visual priority */}
        <View style={{ marginTop: SPACING.md }}>
          <TouchableOpacity style={s.forgeBtn} onPress={() => setShowForge(true)}>
            <Icon name="hammer-wrench" size={20} color={C.neonBlue} />
            <Text style={s.forgeBtnTxt}> ABRIR FORJA DE MISSÕES</Text>
          </TouchableOpacity>
          <Text style={s.forgeSubtitle}>Cria missões personalizadas para subires de nível.</Text>
        </View>

      </ScrollView>

      {/* Weekly Dungeon selection modal */}
      <WeeklyDungeonModal
        visible={showDungeon}
        onClose={() => setShowDungeon(false)}
        onRequestClose={() => setShowDungeon(false)}
        onSelectMission={handleMissionSelect}
        customMissions={customBossMissions}
        defeatedId={weeklyDefeatedBossId}
      />

      {/* Event Dungeon selection modal */}
      <EventDungeonModal
        visible={showEventDungeon}
        onClose={() => setShowEventDungeon(false)}
        onRequestClose={() => setShowEventDungeon(false)}
        onSelectMission={handleMissionSelect}
        eventTrials={eventTrials}
        eventBossMission={eventBossMission}
        eventProgress={activeEventDef ? { completedIds: eventCompleted, required: eventRequired, defeated: eventBossDefeated && eventBossKey === activeEventKey } : null}
      />

      {/* Boss focus timer */}
      {activeBossQuest && activeMission?.type === 'focus' && (
        <MissionActiveScreen
          quest={activeBossQuest}
          onClose={() => setActiveMission(null)}
          onComplete={() => {
            const mins = Math.max(1, Math.round((activeMission.focusDuration ?? 90 * 60_000) / 60_000))
            completeBossMission(activeMission, mins)
          }}
          targetSeconds={activeMission.focusDuration ? activeMission.focusDuration / 1000 : 90 * 60}
        />
      )}

      {/* Boss GPS tracker */}
      {activeBossQuest && activeMission?.type === 'gps' && (
        <GPSTrackerModal
          quest={activeBossQuest}
          onClose={() => setActiveMission(null)}
          onComplete={() => completeBossMission(activeMission)}
        />
      )}

      {/* Boss training confirm */}
      {activeMission?.type === 'training' && (
        <CustomModal
          visible={confirmBossTraining}
          title={`BOSS RAID — ${activeMission?.label?.toUpperCase() || 'CERBERUS'}`}
          message={`Confirmas que completaste:\n\n"${activeMission?.detail || ''}"`}
          confirmLabel="BOSS DERROTADO"
          confirmIcon="sword"
          confirmColor={activeMission?.isEventTrial ? '#f97316' : C.neonRed}
          onConfirm={() => { setConfirmBossTraining(false); completeBossMission(activeMission) }}
          onCancel={() => { setConfirmBossTraining(false); setActiveMission(null) }}
        />
      )}

      {eventProgressInfo && (
        <CustomModal
          visible={Boolean(eventProgressInfo)}
          title="PROGRESSO DE EVENTO"
          message={`Evento ${eventProgressInfo.name} — ${eventProgressInfo.completed}/${eventProgressInfo.required} provas concluídas.`}
          confirmLabel="OK"
          confirmIcon="check"
          confirmColor={C.neonBlue}
          onConfirm={() => setEventProgressInfo(null)}
          onCancel={() => setEventProgressInfo(null)}
        />
      )}

      {/* Victory modal */}
      {victoryInfo && (
        <BossVictoryModal
          visible={!!victoryInfo}
          info={victoryInfo}
          onClose={() => setVictoryInfo(null)}
          onRequestClose={() => setVictoryInfo(null)}
        />
      )}

      {/* ── Regen Confirm Modal ── */}
      <CustomModal
        visible={showRegen}
        title="REGENERAR MISSÕES"
        message={
          'A tua daily pool será regenerada.\n\n' +
          'Limite: 3 regenerações por semana.'
        }
        confirmLabel="REGENERAR"
        confirmIcon="refresh"
        confirmColor={C.neonBlue}
        onConfirm={() => { setShowRegen(false); handleRegenerate() }}
        onCancel={() => setShowRegen(false)}
      />

      {/* ── Regen Result Modal ── */}
      <CustomModal
        visible={regenResult !== null}
        title={regenResult?.success ? 'SISTEMA ATUALIZADO' : 'LIMITE ATINGIDO'}
        message={
          regenResult?.success
            ? 'As missões de hoje foram recalculadas.'
            : (regenResult?.reason ?? 'Não foi possível regenerar.')
        }
        confirmLabel="OK"
        confirmIcon={regenResult?.success ? 'check-circle-outline' : 'alert-circle-outline'}
        confirmColor={regenResult?.success ? C.neonBlue : C.neonRed}
        onConfirm={() => setRegenResult(null)}
        onCancel={() => setRegenResult(null)}
      />

      {/* ── Regen Confirm Modal ── */}
      <CustomModal
        visible={showRegen}
        title="REGENERAR MISSÕES"
        message={
          'A tua daily pool será regenerada.\n\n' +
          'Limite: 3 regenerações por semana.'
        }
        confirmLabel="REGENERAR"
        confirmIcon="refresh"
        confirmColor={C.neonBlue}
        onConfirm={() => { setShowRegen(false); handleRegenerate() }}
        onCancel={() => setShowRegen(false)}
      />

      {/* ── Regen Result Modal ── */}
      <CustomModal
        visible={regenResult !== null}
        title={regenResult?.success ? 'SISTEMA ATUALIZADO' : 'LIMITE ATINGIDO'}
        message={
          regenResult?.success
            ? 'As missões de hoje foram recalculadas.'
            : (regenResult?.reason ?? 'Não foi possível regenerar.')
        }
        confirmLabel="OK"
        confirmIcon={regenResult?.success ? 'check-circle-outline' : 'alert-circle-outline'}
        confirmColor={regenResult?.success ? C.neonBlue : C.neonRed}
        onConfirm={() => setRegenResult(null)}
        onCancel={() => setRegenResult(null)}
      />

      {showForge && <QuestForgeScreen onClose={() => setShowForge(false)} />}
    </View>
  )
}

// ── Side Quest rank config ──────────────────────────────────────────────────────

const SIDE_RANK_COLOR: Record<string, string> = {
  E: '#94a3b8',
  D: '#22c55e',
  C: '#00d4ff',
}

// ── Side Quest Card ────────────────────────────────────────────────────────────

function SideQuestCard({ sq }: { sq: SideQuest }) {
  const completeSQ = useGameStore(s => s.completeSideQuest)
  const startSQ    = useGameStore(s => s.startSideQuest)
  const updateNote = useGameStore(s => s.updateSideQuestNote)
  const removeSQ   = useGameStore(s => s.removeSideQuest)

  const [confirm, setConfirm] = useState(false)
  const [showTimerSelect, setShowTimerSelect] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState(sq.note || '')

  const rankColor = SIDE_RANK_COLOR[sq.rank] ?? C.muted
  const isActive  = sq.startTime && !sq.done && (Date.now() - sq.startTime < (sq.duration ?? 0) * 1000)

  // Timer logic
  const [timeLeft, setTimeLeft] = useState(0)
  useEffect(() => {
    if (!sq.startTime || !sq.duration || sq.done) return
    const update = () => {
      const elapsed = (Date.now() - sq.startTime!) / 1000
      const remaining = Math.max(0, sq.duration! - elapsed)
      setTimeLeft(Math.floor(remaining))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => { if (interval) clearInterval(interval) }
  }, [sq.startTime, sq.duration, sq.done])

  function handleComplete() {
    cancelSideQuestNotification(sq.id).catch(() => {})
    const { leveledUp } = completeSQ(sq.id)
    // Removed redundant vibration
  }

  const mm = Math.floor(timeLeft / 60)
  const ss = Math.floor(timeLeft % 60)

  return (
    <View style={[sq_s.card, { borderLeftColor: rankColor }, sq.done && sq_s.cardDone, !!isActive && sq_s.cardActive]}>
      <View style={[sq_s.rankBadge, { backgroundColor: rankColor + '18', borderColor: rankColor + '66' }]}>
        <Text style={[sq_s.rankTxt, { color: rankColor }]}>{sq.rank}</Text>
      </View>

      <View style={sq_s.info}>
        <Text style={[sq_s.title, sq.done && sq_s.titleDone]} numberOfLines={2}>{sq.title}</Text>
        {sq.note && !sq.done && <Text style={sq_s.noteLine}>{sq.note}</Text>}
        
        <View style={sq_s.rewardRow}>
          <Icon name="star-four-points" size={9} color={sq.done ? C.dimmed : C.neonBlue} />
          <Text style={[sq_s.xp, sq.done && sq_s.dimmed]}> {sq.xp} XP</Text>
          <Text style={[sq_s.gold, sq.done && sq_s.dimmed]}>  ◈{sq.gold}</Text>
          
          {sq.startTime && !sq.done && (
            <View style={[sq_s.timerRow, { marginLeft: 12 }]}>
              <Icon name="clock-outline" size={10} color={C.purple} />
              <Text style={sq_s.timerTxt}>{mm}:{ss.toString().padStart(2, '0')}</Text>
            </View>
          )}
        </View>
      </View>

      {!sq.done && (
        <>
          <TouchableOpacity style={sq_s.actionBtn} onPress={() => setShowNoteInput(true)}>
            <Icon name="note-edit-outline" size={16} color={C.dimmed} />
          </TouchableOpacity>
          
          {!sq.startTime && (
            <TouchableOpacity style={sq_s.actionBtn} onPress={() => setShowTimerSelect(true)}>
              <Icon name="timer-outline" size={17} color={C.purple} />
            </TouchableOpacity>
          )}
        </>
      )}

      {sq.done ? (
        <View style={sq_s.doneWrap}>
          <Icon name="check-circle" size={16} color={C.green} />
        </View>
      ) : (
        <TouchableOpacity style={[sq_s.doneBtn, { borderColor: rankColor }]} onPress={() => setConfirm(true)}>
          <Icon name="check-bold" size={13} color={rankColor} />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={sq_s.delBtn} onPress={() => {
        cancelSideQuestNotification(sq.id).catch(() => {})
        removeSQ(sq.id)
      }}>
        <Icon name="close" size={13} color={C.dimmed} />
      </TouchableOpacity>

      {/* Timer Selection Modal */}
      <CustomModal
        visible={showTimerSelect}
        title="DEFINIR TEMPO"
        message="Quanto tempo vais dedicar a esta tarefa?"
        confirmLabel="30 MIN"
        onConfirm={() => {
          setShowTimerSelect(false)
          startSQ(sq.id, 30)
          scheduleSideQuestNotification(sq.id, 30 * 60_000, sq.title).catch(() => {})
        }}
        cancelLabel="60 MIN"
        onCancel={() => {
          setShowTimerSelect(false)
          startSQ(sq.id, 60)
          scheduleSideQuestNotification(sq.id, 60 * 60_000, sq.title).catch(() => {})
        }}
      />

      {/* Note Input Modal */}
      <Modal transparent visible={showNoteInput} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.panel, padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={{ color: C.purple, fontFamily: FONT.orbitron, marginBottom: 10 }}>NOTA DA MISSÃO</Text>
            <TextInput
              style={{ backgroundColor: C.bg, color: '#fff', padding: 12, borderRadius: 8, textAlignVertical: 'top', height: 100 }}
              multiline
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Escreve aqui..."
              placeholderTextColor={C.dimmed}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: C.purple, padding: 12, borderRadius: 8, alignItems: 'center' }}
                onPress={() => { updateNote(sq.id, noteText); setShowNoteInput(false) }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>GUARDAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, borderWidth: 1, borderColor: C.dimmed, padding: 12, borderRadius: 8, alignItems: 'center' }}
                onPress={() => setShowNoteInput(false)}
              >
                <Text style={{ color: C.dimmed }}>CANCELAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomModal
        visible={confirm}
        title="MISSÃO SECUNDÁRIA"
        message={`Concluíste:\n"${sq.title}"?`}
        confirmLabel="SIM, CONCLUÍ"
        confirmIcon="check-circle-outline"
        confirmColor={rankColor}
        onConfirm={() => { setConfirm(false); handleComplete() }}
        onCancel={() => setConfirm(false)}
      />
    </View>
  )
}

// ── Side Quest Section ─────────────────────────────────────────────────────────

function SideQuestSection() {
  const sideQuests = useGameStore(s => s.sideQuests)
  const addSQ      = useGameStore(s => s.addSideQuest)
  const [collapsed, setCollapsed] = useState(false)
  const [input, setInput]         = useState('')

  function handleAdd() {
    const title = input.trim()
    if (!title) return
    addSQ(title)
    setInput('')
  }

  const doneCount  = sideQuests.filter(q => q.done).length
  const totalCount = sideQuests.length

  return (
    <View style={side.container}>
      <TouchableOpacity style={side.header} onPress={() => setCollapsed(v => !v)} activeOpacity={0.7}>
        <Icon name="sword-cross" size={14} color={C.purple} />
        <Text style={side.title}> MISSÕES SECUNDÁRIAS</Text>
        {totalCount > 0 && (
          <View style={side.badge}>
            <Text style={side.badgeTxt}>{doneCount}/{totalCount}</Text>
          </View>
        )}
        <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={16} color={C.muted} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {!collapsed && (
        <>
          <Text style={side.sub}>
            Tarefas pessoais. Não contam para streak. O Sistema atribui recompensa aleatória.
          </Text>

          <View style={side.inputRow}>
            <TextInput
              style={side.input}
              value={input}
              onChangeText={setInput}
              placeholder="Nova tarefa..."
              placeholderTextColor={C.dimmed}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity style={side.addBtn} onPress={handleAdd}>
              <Icon name="plus" size={18} color={C.purple} />
            </TouchableOpacity>
          </View>

          {sideQuests.length === 0 ? (
            <Text style={side.empty}>Sem missões secundárias. Adiciona uma acima.</Text>
          ) : (
            sideQuests.map(sq => <SideQuestCard key={sq.id} sq={sq} />)
          )}
        </>
      )}
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

