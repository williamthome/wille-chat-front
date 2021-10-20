export const fakeData = (state: any) => {
  state.username = 'Wille'
  state.roomName = 'room1'
  state.rooms = {
    room1: {
      users: [
        {
          username: 'Wille',
          clientId: 'id1',
        },
        {
          username: 'João',
          clientId: 'id2',
          typing: true,
        },
        {
          username: 'Pedro',
          clientId: 'id3',
        },
      ],
      messages: [
        {
          from: 'Wille',
          text: 'Something',
          when: Date.now(),
        },
        {
          from: 'Other',
          text: 'Something 2',
          when: Date.now(),
        },
        {
          from: 'Wille',
          text: 'Something',
          when: Date.now(),
        },
        {
          from: 'Other',
          text: 'Something 2',
          when: Date.now(),
        },
        {
          from: 'Wille',
          text: 'Something',
          when: Date.now(),
        },
        {
          from: 'Other',
          text: 'Something 2',
          when: Date.now(),
        },
        {
          from: 'Wille',
          text: 'Something',
          when: Date.now(),
        },
        {
          from: 'Other',
          text: 'Something 2',
          when: Date.now(),
        },
      ],
    },
  }
}
