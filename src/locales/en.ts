export interface LocaleMessages {
  metadata: {
    titleDefault: string
    titleTemplate: string
    description: string
  }
  nav: {
    home: string
    tags: string
    links: string
    search: string
    back: string
  }
  pageTitle: {
    home: string
    tags: string
    links: string
    search: string
    page: string
  }
  sidebar: {
    telegramFeed: string
    command: string
    language: string
  }
  localeNames: {
    en: string
    ja: string
    zh: string
  }
  external: {
    rss: string
    website: string
    twitter: string
    github: string
    telegram: string
    mastodon: string
    bluesky: string
  }
  feed: {
    older: string
    newer: string
    edited: string
    discussion: string
    reactionsAndViewsAria: string
    viewCountTitle: string
    channelAvatarAlt: string
    avatarSuffix: string
    emojiAlt: string
  }
  post: {
    backToFeed: string
  }
  theme: {
    toggle: string
  }
  codeCopy: {
    copyCode: string
    copied: string
  }
  commandPalette: {
    dialogTitle: string
    closeDialog: string
    openButton: string
    inputSearch: string
    inputCommand: string
    groupActions: string
    groupNavigate: string
    groupInternal: string
    groupCustom: string
    groupSearch: string
    groupResults: string
    searchPostsAction: string
    backToCommands: string
    buildingIndex: string
    indexUnavailable: string
    emptySearchHint: string
    noMatches: string
    openFullResults: string
    enterKey: string
    commandOpenHint: string
  }
  searchPanel: {
    loadingIndex: string
    indexUnavailable: string
    emptyQueryPrefix: string
    emptyQuerySuffix: string
    noMatches: string
    heading: string
    headingFallback: string
    matchLabel: string
    defaultPostTitlePrefix: string
  }
  notFound: {
    code: string
    title: string
    description: string
    goHome: string
    openSearch: string
  }
}

export const enMessages: LocaleMessages = {
  metadata: {
    titleDefault: 'Telecast',
    titleTemplate: '%s | Telecast',
    description: 'Turn your Telegram channel into a microblog powered by React and shadcn/ui.',
  },
  nav: {
    home: 'Home',
    tags: 'Tags',
    links: 'Links',
    search: 'Search',
    back: 'Back',
  },
  pageTitle: {
    home: 'Home',
    tags: 'Tags',
    links: 'Links',
    search: 'Search',
    page: 'Page',
  },
  sidebar: {
    telegramFeed: 'Telegram feed',
    command: 'Command',
    language: 'Languages',
  },
  localeNames: {
    en: 'English',
    ja: 'Japanese',
    zh: 'Chinese',
  },
  external: {
    rss: 'RSS',
    website: 'Website',
    twitter: 'Twitter',
    github: 'GitHub',
    telegram: 'Telegram',
    mastodon: 'Mastodon',
    bluesky: 'Bluesky',
  },
  feed: {
    older: 'Older',
    newer: 'Newer',
    edited: 'Edited',
    discussion: 'Discussion',
    reactionsAndViewsAria: 'Post reactions and views',
    viewCountTitle: 'Telegram view count',
    channelAvatarAlt: 'Channel avatar',
    avatarSuffix: ' avatar',
    emojiAlt: 'emoji',
  },
  post: {
    backToFeed: 'Back to Feed',
  },
  theme: {
    toggle: 'Toggle theme',
  },
  codeCopy: {
    copyCode: 'Copy code',
    copied: 'Copied',
  },
  commandPalette: {
    dialogTitle: 'Command menu',
    closeDialog: 'Close',
    openButton: 'Search posts...',
    inputSearch: 'Search posts, tags, and content...',
    inputCommand: 'Type a command...',
    groupActions: 'Actions',
    groupNavigate: 'Navigate',
    groupInternal: 'Internal Links',
    groupCustom: 'Custom Links',
    groupSearch: 'Search',
    groupResults: 'Results',
    searchPostsAction: 'Search posts',
    backToCommands: 'Back to commands',
    buildingIndex: 'Building search index...',
    indexUnavailable: 'Search index is unavailable right now.',
    emptySearchHint: 'Type keywords to search posts and tags.',
    noMatches: 'No matches for this query.',
    openFullResults: 'Open full results page',
    enterKey: 'Enter',
    commandOpenHint: 'open command palette (Cmd/Ctrl+K)',
  },
  searchPanel: {
    loadingIndex: 'Loading search index...',
    indexUnavailable: 'Search index is unavailable right now.',
    emptyQueryPrefix: 'Enter a query in the URL (for example:',
    emptyQuerySuffix: ') or use Cmd/Ctrl+K.',
    noMatches: 'No posts matched this query.',
    heading: 'Search',
    headingFallback: 'open command palette (Cmd/Ctrl+K)',
    matchLabel: 'Match',
    defaultPostTitlePrefix: 'Post',
  },
  notFound: {
    code: 'Error 404',
    title: 'Page not found',
    description: 'This page does not exist, has moved, or the URL is incorrect.',
    goHome: 'Go Home',
    openSearch: 'Open Search',
  },
}
