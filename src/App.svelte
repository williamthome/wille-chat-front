<script lang="ts">
  import { io } from "socket.io-client"
  import type { Socket } from "socket.io-client"
  import { onDestroy, onMount } from "svelte"

  type User = { clientId: Socket['id']; username: string; typing?: boolean }
  type Message = { from: string | 'bot'; text: string; when: number }
  type Room = { users: User[]; messages: Message[] }
  type Rooms = { [name: string]: Room }
  type ChatError = { message: string }

  let socket: Socket
  let pickedRoomName: string | undefined
  let typingTimeoutId: number | undefined

  let state: {
    error?: ChatError
    username?: string
    message?: string
    roomName?: string
    rooms?: Rooms
  } = {}

  $: rooms = () => {
    const names: Array<Room & { name: string }> = []
    if (state.rooms) {
      for (const [name, room] of Object.entries(state.rooms)) {
        names.push({ name, ...room })
      }
    }
    return names
  }
  $: pickedRoomNameExists = pickedRoomName && rooms().some(room => room.name === pickedRoomName)
  $: restOfUsersInRoom = state.username && state.rooms && state.roomName && state.rooms[state.roomName]
    ? state.rooms[state.roomName].users.filter(user => user.username !== state.username)
    : []

  const login = (event: Event): void => {
    const form = event.target as HTMLFormElement
    const formData = new FormData(form)
    const data: { username?: string } = {}
    for (const [key, value] of formData.entries()) {
      (data as any)[key] = value
    }
    socket.emit('login', data)
  }

  const logout = (): void => {
    socket.emit('logout')
  }

  const joinOrCreateRoom = (event: Event): void => {
    const form = event.target as HTMLFormElement
    const formData = new FormData(form)
    const data: { roomName?: string } = {}
    for (const [key, value] of formData.entries()) {
      (data as any)[key] = value
    }
    socket.emit('joinOrCreateRoom', data)
  }

  const leaveRoom = (): void => {
    socket.emit('leaveRoom')
  }

  const sendMessage = (event: Event): void => {
    const form = event.target as HTMLFormElement
    const formData = new FormData(form)
    const data: { message?: string } = {}
    for (const [key, value] of formData.entries()) {
      (data as any)[key] = value
    }
    form.reset()
    socket.emit('message', data)
    socket.emit('typing', { typing: false })
  }

  const onTyping = (event: Event): void => {
    const input = event.target as HTMLInputElement
    if (typingTimeoutId) clearTimeout(typingTimeoutId)
    typingTimeoutId = setTimeout(() => {
      socket.emit('typing', { typing: !!input.value })
      clearTimeout(typingTimeoutId)
      typingTimeoutId = undefined
    }, 200)
  }

  const playSound = (url: string) => {
    const audio = new Audio(url)
    audio.canPlayType('audio/mp3') && audio.play()
  }

  const playMessageSendSound = () => playSound('https://soundbible.com/mp3/sms-alert-5-daniel_simon.mp3')
  const playMessageReceivedSound = () => playSound('https://soundbible.com/mp3/Bike%20Horn-SoundBible.com-602544869.mp3')

  const setupSocket = (): void => {
    socket = io(process.env.SOCKET_URL || 'http://localhost:5000')

    socket.on('error', (error: ChatError) => {
      state.error = error

      console.error(error)
    })

    socket.on('disconnect', () => {
      state = {}

      console.log('socket disconnected')
    })

    socket.on('login', (data: { rooms: Rooms, username: string }) => {
      const { rooms, username } = data
      state.rooms = rooms
      state.username = username

      console.log('logged in', data, state)
    })

    socket.on('logout', () => {
      state = {}

      console.log('logged out', state)
    })

    socket.on('joinedRoom', (data: { roomName: string, room: Room }) => {
      if (!state.rooms) return

      const { roomName, room } = data
      state.roomName = roomName
      state.rooms[roomName] = {
        ...room,
        messages: [
          {
            from: 'bot',
            text: room.users.length > 1
              ? 'Welcome! 🎉 Send some message 🙃'
              : 'Welcome! 🎉 Wait someone join in room or talk with yourself 🤳',
            when: Date.now()
          }
        ]
      }

      console.log('joined room', data, state)
    })

    socket.on('leaveRoom', (data: { rooms: Rooms }) => {
      const { rooms } = data
      state.roomName = undefined
      state.rooms = rooms

      console.log('leaved room', data, state)
    })

    socket.on('roomCreated', (data: { roomName: string, rooms: Rooms }) => {
      if (!state.rooms) return

      const { rooms } = data
      state.rooms = rooms

      console.log('room created', data, state)
    })

    socket.on('roomDeleted', (data: { roomName: string, rooms: Rooms }) => {
      if (!state.rooms) return

      const { rooms } = data
      state.rooms = rooms

      console.log('room deleted', data, state)
    })

    socket.on('userJoinRoom', (data: { username: string, users: User[] }) => {
      if (!state.rooms || !state.roomName) return

      const { users } = data
      state.rooms[state.roomName].users = users

      console.log('new one in room', data, state)
    })

    socket.on('userLeftRoom', (data: { username: string, users: User[] }) => {
      if (!state.rooms || !state.roomName) return

      const { users } = data
      state.rooms[state.roomName].users = users

      console.log('one left from room', data, state)
    })

    socket.on('message', (data: { message: Message, messages: Message[] }) => {
      if (!state.rooms || !state.roomName) return

      const { message } = data
      state.rooms[state.roomName].messages = [...state.rooms[state.roomName].messages, message]

      console.log('new message', data, state)

      const messageFromLoggedUser = message.from !== state.username
      messageFromLoggedUser && playMessageSendSound()
      !messageFromLoggedUser && playMessageReceivedSound()
    })

    socket.on('typing', (data: { username: string, typing: boolean }) => {
      const { roomName } = state
      if (!roomName || !state.rooms) return

      const { username, typing } = data
      const userIndex = state.rooms[roomName].users.findIndex((user) => user.username === username)
      state.rooms[roomName].users[userIndex].typing = typing

      console.log('user is typing', { username, typing })
    })
  }

  onMount(() => {
    setupSocket()
    // fakeData()
  })

  onDestroy(() => {
    socket.disconnect()
  })
</script>

<main>
  {#if state.error}
    <div class="error">
      <span>{state.error.message}</span>
      <button on:click|preventDefault="{() => state.error = undefined}">&times;</button>
    </div>
  {/if}
  <div class="container">
    <div class="toolbar">
      {#if !state.username}
        <div class="title">
          <h1>My Chat!</h1>
          <p>Enter a username and give a try 🚀</p>
        </div>
        <form class="login" on:submit|preventDefault="{login}">
          <input autofocus type="text" name="username" placeholder="Your username" required minlength="3">
          <input type="submit" value="Login">
        </form>
      {:else}
        <div class="nav">
          {#if state.rooms && state.roomName && state.rooms[state.roomName]}
            <div class="nav__info">
              <div><strong>Room: </strong>#{state.roomName}</div>
              <div><strong>You: </strong>@{state.username}</div>
              <span>
                <strong>Others:</strong>
                {#if restOfUsersInRoom.length > 0}
                  {#each restOfUsersInRoom as user}
                    <span class="nav__info--users">
                      <span class:typing="{user.typing}">
                        @{user.username}
                      </span>
                      {#if user.typing}
                        <span class="dots">
                          <span></span>
                          <span></span>
                          <span></span>
                        </span>
                      {/if}
                    </span>
                  {/each}
                {:else}
                  Only you
                {/if}
              </span>
            </div>
          {/if}
          <div class="nav__options">
            <button class="nav__options--logout" on:click="{logout}">Logout</button>
            {#if state.roomName}
              <button class="nav__options--leave-room" on:click="{leaveRoom}">Leave room</button>
            {/if}
          </div>
        </div>
      {/if}
      {#if state.username && !state.roomName}
        <div class="title">
          <h1>My Chat!</h1>
          <p>Enter a room name and enjoy!</p>
        </div>
        <form class="room" on:submit|preventDefault="{joinOrCreateRoom}">
          <input autofocus type="text" name="roomName" list="rooms" placeholder="Join or create a room" bind:value="{pickedRoomName}">
          <datalist id="rooms">
            {#each rooms() as room}
              <option value="{room.name}">
            {/each}
          </datalist>
          <input type="submit" value="{pickedRoomNameExists ? 'Join' : 'Create'}">
        </form>
      {/if}
    </div>
    {#if state.rooms && state.roomName && state.rooms[state.roomName]}
      <div class="chat">
        <ul class="chat__messages">
          {#each state.rooms[state.roomName].messages as message}
            <li
              class="chat__message"
              class:sent="{message.from === state.username}"
              class:bot="{message.from === 'bot'}"
            >
              {#if message.from !== state.username && message.from !== 'bot'}
                <div class="chat__message--username">{message.from}</div>
              {/if}
              <div class="chat__message--text">{message.text}</div>
              <div class="chat__message__info">
                <div
                  class="chat__message__info--when"
                  class:sent="{message.from === state.username}"
                  class:bot="{message.from === 'bot'}"
                >
                  {new Date(message.when).toLocaleString()}
                </div>
              </div>
            </li>
          {/each}
        </ul>
        <form class="chat__input-area" on:submit|preventDefault="{sendMessage}">
          <input
            autofocus
            type="text"
            name="message"
            placeholder="Type something"
            required
            minlength="1"
            on:input="{onTyping}">
          <input type="submit" value="Send">
        </form>
      </div>
    {/if}
  </div>
</main>

<style lang="scss">
  :global(body) {
    display: flex;
    justify-content: center;
    background-color: #eee;
  }

  main {
    display: flex;
    flex-direction: column;
    background-color: white;
    width: 100%;
    max-width: 40rem;
    height: 100%;
  }

  .container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    height: 100%;
    position: relative;
  }

  .title {
    position: absolute;
    top: 0;
    left: 2rem;
  }

  .error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: red;
    padding: 0.5rem;
    border-bottom: 0.0625rem solid red;

    & span {
      flex-grow: 1;
    }

    & button {
      background: none;
      border-color: red;
      color: red;
      margin: 0;
    }
  }

  .login {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    & > * {
      width: 100%;
    }

    & input[type='submit'] {
      padding-right: 1rem;
      padding-left: 1rem;
      color: white;
      background-color: dodgerblue;
    }
  }

  .nav {
    display: flex;
    justify-content: flex-end;

    &__info {
      flex-grow: 1;
      display: flex;
      flex-direction: column;

      &--users {
        & span.typing {
          font-style: italic;
        }

        & .dots {
          margin-left: 0.25rem;
          margin-right: 1.5rem;

          & span {
            position: relative;

            &::before {
              content: '';
              position: absolute;
              left: 0;
              bottom: 0.3rem;
              width: 0.2rem;
              height: 0.2rem;
              background-color: #333;
              border-radius: 50%;
              animation-name: typing;
              animation-duration: 1s;
              animation-iteration-count: infinite;
              animation-timing-function: ease;
            }

            &:nth-child(2)::before {
              left: 0.4rem;
              animation-delay: 0.2s;
            }

            &:nth-child(3)::before {
              left: 0.8rem;
              animation-delay: 0.4s;
            }

            @keyframes typing {
              20% { transform: translateY(0); }
              50% { transform: translateY(-0.2rem); }
            }
          }
        }
      }
    }

    &__options {
      display: flex;
      flex-direction: column;
      margin-left: 0.5rem;

      & button {
        padding-right: 1rem;
        padding-left: 1rem;
      }

      &--logout {
        color: white;
        background-color: dodgerblue;
      }

      &--leave-room {
        color: white;
        background-color: green;
        margin-bottom: 0;
      }
    }
  }

  .room {
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    & > * {
      width: 100%;
    }

    & input[type='submit'] {
      padding-right: 1rem;
      padding-left: 1rem;
      color: white;
      background-color: green;
    }
  }

  .chat {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;

    &__messages {
      flex-grow: 1;
      border: 0.0625rem solid #ccc;
      margin: 1rem 0;
      padding: 1rem;
      overflow-y: auto;
    }

    &__message {
      display: flex;
      flex-direction: column;
      max-width: 90%;
      margin: 1rem 0;
      padding: 0.5rem;
      border: 0.0625rem solid #ccc;
      border-radius: 0.5rem;

      &:only-child {
        margin: 0;
      }

      &:first-of-type:not(:only-child) {
        margin-top: 0;
        margin-bottom: 0.5rem;
      }

      &:last-of-type:not(:only-child) {
        margin-bottom: 0;
        margin-top: 0.5rem;
      }

      &:nth-child(2):last-child {
        margin-top: 1rem;
      }

      &.sent {
        margin-left: auto;
        color: white;
        background-color: rgb(128, 191, 255);
      }

      &.bot {
        color: white;
        background-color: tomato;
      }

      &--username:not(.bot) {
        color: gray;
        font-size: 0.75rem;
      }

      &__info {
        display: flex;
        justify-content: flex-end;
        font-size: 0.75rem;

        &--when {
          font-style: italic;
        }

        &--when:not(.sent):not(.bot) {
          color: gray;
        }
      }
    }

    &__input-area {
      display: flex;

      & input {
        margin-bottom: 0;
      }

      & input[type='text'] {
        flex-grow: 1;
      }

      & input[type='submit'] {
        margin-left: 0.5rem;
        padding-right: 1rem;
        padding-left: 1rem;
        color: white;
        background-color: dodgerblue;
      }
    }
  }

  ul {
    padding: 0;
    margin: 0;
    list-style-type: none;
  }
</style>