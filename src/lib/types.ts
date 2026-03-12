export interface ChannelReaction {
  emoji: string
  emojiId?: string
  emojiImage?: string
  count: string
  isPaid?: boolean
}

export interface ChannelPost {
  id: string
  title: string
  type: 'service' | 'text'
  datetime: string
  edited?: boolean
  views?: string
  tags: string[]
  text: string
  content: string
  reactions: ChannelReaction[]
}

export interface ChannelInfo {
  posts: ChannelPost[]
  title: string
  description: string
  descriptionHTML: string
  avatar?: string
}

export interface NavLink {
  title: string
  href: string
}
