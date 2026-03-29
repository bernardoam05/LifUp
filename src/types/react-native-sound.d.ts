declare module 'react-native-sound' {
  class Sound {
    static MAIN_BUNDLE: string
    static DOCUMENT: string
    static LIBRARY: string
    static CACHES: string
    static setCategory(category: string, mixWithOthers?: boolean): void

    constructor(filename: string, basePath: string, callback?: (error: any) => void)
    play(callback?: (success: boolean) => void): void
    pause(callback?: () => void): void
    stop(callback?: () => void): void
    release(): void
    setVolume(volume: number): void
    setNumberOfLoops(loops: number): void
    isLoaded(): boolean
    isPlaying(): boolean
  }
  export default Sound
}
