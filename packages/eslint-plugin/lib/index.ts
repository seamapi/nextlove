import requireIndex from "requireindex";

// import all rules in lib/rules
export = {
  rules: requireIndex(__dirname + "/rules")
}



