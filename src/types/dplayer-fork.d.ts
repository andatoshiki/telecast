declare module '../../../docs/dplayer/dist/DPlayer.min.js' {
  interface DPlayerVideoOptions {
    url: string
    pic?: string
    type?: string
  }

  interface DPlayerOptions {
    container: HTMLElement
    autoplay?: boolean
    loop?: boolean
    screenshot?: boolean
    theme?: string
    preload?: 'none' | 'metadata' | 'auto'
    mutex?: boolean
    video: DPlayerVideoOptions
  }

  export default class DPlayer {
    constructor(options: DPlayerOptions)
    video?: HTMLVideoElement
    destroy(): void
  }
}
