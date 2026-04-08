# Scenario Writing Guide

## Check Criteria

> "Can I write test code just by reading this sentence?"

Both given/when/then and the expect in examples follow the same principle: **values verifiable on screen**.

---

## 1. given/when/then Writing Criteria

| Field | Writing Criteria | Allowed | Prohibited |
|---|---|---|---|
| given | **Observable preconditions** such as screen state, data count, applied conditions | "A list showing 3 to-do items", "A state with the search term 'milk' entered" | "3 items exist in the todos array", "isLoading is true" |
| when | **Specific UI element + action** (click, input, drag, etc.) | "Click the 'Delete' button", "Enter 'Meeting notes' in the 'Title' input field" | "Call the delete function", "Change the state" |
| then | **Assertable result on screen** | "'2 to-do items' text is displayed", "Empty list guidance message appears" | "todos.length is 2", "API is called" |

### Good/Bad Examples

**Good:**
```yaml
given: "A to-do add form with an empty 'Title' input field"
when: "Click the 'Add' button"
then: "'Please enter a title' error message is displayed"
```

**Bad:**
```yaml
given: "formState.title is an empty string"
when: "Trigger a submit event"
then: "validation error is set"
```

---

## 2. examples Writing Criteria

### Allowed values for expect

Only write values that can be directly verified (asserted) on screen.

| Type | Example |
|---|---|
| Screen text | `{ message: "To-do has been added" }` |
| Element count | `{ cardCount: 3 }` |
| Existence | `{ deleteButton: true }` |
| Input field value | `{ titleField: "Write meeting notes" }` |
| CSS state | `{ status: "completed", opacity: "0.5" }` |
| List/Order | `{ columns: ["To Do", "In Progress", "Done"] }` |

### Prohibited values for expect

| Type | Reason |
|---|---|
| Internal state (state, store) | Not verifiable by the user on screen |
| Function call status | Implementation-dependent |
| DB/API raw data | Server internal values, not screen values |

### Good/Bad Examples

**Good:**
```yaml
examples:
  - input: { title: "Buy milk" }
    expect: { itemText: "Buy milk", itemCount: 1 }
  - input: { title: "" }
    expect: { errorMessage: "Please enter a title" }
```

**Bad:**
```yaml
examples:
  - input: { title: "Buy milk" }
    expect: { todos: [{ id: 1, title: "Buy milk", done: false }] }
  - input: { title: "Buy milk" }
    expect: { addTodoCalled: true, apiResponse: 201 }
```
