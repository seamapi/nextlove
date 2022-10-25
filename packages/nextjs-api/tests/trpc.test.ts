import test from "ava"

const initTRPC: any = {}

type User = {
  id: string
  name: string
}
type Context = {
  user: User | null
}

const t = initTRPC.context<Context>().create()

const isAuthed = t.middleware(({ next, ctx }) => {
  return next({
    ctx: {
      user: ctx.user,
    },
  })
})
const addService = t.middleware(({ next, ctx }) => {
  return next({
    ctx: {
      doSomething: () => {
        return "very cool service"
      },
    },
  })
})

t.procedure
  .use(isAuthed)
  .use(addService)
  .query(({ ctx }) => {
    expectTypeOf(ctx.doSomething).toMatchTypeOf<() => string>()
    expectTypeOf(ctx.user).toMatchTypeOf<User>()
  })
