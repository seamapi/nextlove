import test from "ava"

const builder = {
  funcs: [] as Function[],
  use(fn) {
    this.funcs.push(fn)
    return this
  },
  transform(a) {
    for (let i = 0; i < this.funcs.length; i++) {
      a = this.funcs[i](a)
    }
    return a
  },
}

builder.use((a: number) => a.toString())
builder.use((b: string) => b + "4")
builder.use((c: string) => parseInt(c) as number)

const q = builder.transform(2)
console.log(q)
typeof q === "string"
