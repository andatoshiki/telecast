export interface ChannelReaction {
  emoji: string
  emojiId?: string
  emojiImage?: string
  count: string
  isPaid?: boolean
}

export interface UnavailableMedia {
  duration: string
  url: string
}

export interface DocumentAttachment {
  name: string
  size: string
  url: string
}

export interface ChannelServiceEvent {
  kind: 'channel-photo-updated' | 'message-pinned' | 'channel-created' | 'generic'
  text: string
  detail?: string
  image?: string
  targetPostId?: string
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
  unavailableMedia?: UnavailableMedia
  attachments?: DocumentAttachment[]
  service?: ChannelServiceEvent
  reactions: ChannelReaction[]
}

export interface ChannelInfo {
  posts: ChannelPost[]
  title: string
  description: string
  descriptionHTML: string
  avatar?: string
  subscriberCount?: string
}

export interface NavLink {
  title: string
  href: string
}
