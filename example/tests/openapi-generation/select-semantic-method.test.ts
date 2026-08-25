import test from "ava"
import { selectSemanticMethod } from "nextlove/generators"

test("single method is the semantic method", (t) => {
  t.is(selectSemanticMethod("/api/todo/get", ["GET"]), "GET")
  t.is(selectSemanticMethod("/api/todo/add", ["POST"]), "POST")
  t.is(selectSemanticMethod("/api/todo/delete", ["DELETE"]), "DELETE")
})

test("two methods pick the one that is not POST", (t) => {
  t.is(selectSemanticMethod("/api/todo/list", ["GET", "POST"]), "GET")
  t.is(selectSemanticMethod("/api/todo/list", ["POST", "GET"]), "GET")
  t.is(selectSemanticMethod("/api/todo/update", ["PATCH", "POST"]), "PATCH")
  t.is(selectSemanticMethod("/api/todo/replace", ["PUT", "POST"]), "PUT")
})

test("three or more methods throws and asks for deprecatedMethods", (t) => {
  const error = t.throws(() =>
    selectSemanticMethod("/api/todo/multi", ["GET", "DELETE", "POST"])
  )
  t.regex(error!.message, /deprecatedMethods/)
  t.regex(error!.message, /\/api\/todo\/multi/)
})

test("deprecatedMethods bring the count back down to a single semantic method", (t) => {
  // Reduce three methods to the semantic GET (plus its dropped POST alias).
  t.is(
    selectSemanticMethod(
      "/api/todo/multi",
      ["GET", "DELETE", "POST"],
      ["DELETE"]
    ),
    "GET"
  )
  // Reduce three methods all the way to one.
  t.is(
    selectSemanticMethod(
      "/api/todo/multi",
      ["GET", "DELETE", "POST"],
      ["DELETE", "POST"]
    ),
    "GET"
  )
})

test("two non-POST methods are still ambiguous", (t) => {
  const error = t.throws(() =>
    selectSemanticMethod("/api/todo/two-reads", ["GET", "DELETE"])
  )
  t.regex(error!.message, /deprecatedMethods/)
})

test("returns undefined when every method is deprecated", (t) => {
  t.is(
    selectSemanticMethod("/api/todo/all-deprecated", ["GET"], ["GET"]),
    undefined
  )
})
