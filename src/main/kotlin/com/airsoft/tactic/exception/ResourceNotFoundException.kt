package com.airsoft.tactic.exception

class ResourceNotFoundException : RuntimeException {
    constructor(message: String) : super(message)
    constructor(resource: String, id: Any) : super("$resource not found: $id")
}
