class ActiveTutors {
    constructor(id, quals) {
        this.id = id
        this.quals = quals
        this.questions = []
    }
}

class Question {
    constructor(prompt, subject, userId, level) {
        this.prompt = prompt
        this.subject = subject
        this.userId = userId
        this.level = level
    }
}

module.exports = ActiveTutors