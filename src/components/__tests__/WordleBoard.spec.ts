import {mount} from "@vue/test-utils"
import WordleBoard from "../WordleBoard.vue"
import {DEFEAT_MESSAGE, MAX_GUESSES_COUNT, VICTORY_MESSAGE, WORD_SIZE} from "../../settings"
import type {UserEvent} from "@testing-library/user-event"
import userEvent from "@testing-library/user-event"
import {cleanup, render, screen} from "@testing-library/vue"

describe("WordleBoard", () => {
    let wordOfTheDay = "TESTS"
    let user: UserEvent

    beforeEach(() => {
        user = userEvent.setup()
        render(WordleBoard, {props: {wordOfTheDay}})
    })

    afterEach(() => {
        cleanup()
    })

    async function playerTypesGuess(guess: string) {
        await user.type(screen.getByRole('textbox'), guess)
    }

    async function playerPressesEnter() {
        await user.type(screen.getByRole('textbox'), "{enter}")
    }

    async function playerTypesAndSubmitsGuess(guess: string) {
        await playerTypesGuess(guess)
        await playerPressesEnter()
    }

    describe("End of the game messages", () => {
        test("a victory message appears when the user makes a guess that matches the word of the day", async () => {
            await playerTypesAndSubmitsGuess(wordOfTheDay)

            expect(screen.queryByText(VICTORY_MESSAGE)).toBeInTheDocument()
        })

        describe.each(
            Array.from(
                {length: MAX_GUESSES_COUNT + 1},
                (_, numberOfGuesses) => ({
                    numberOfGuesses,
                    shouldSeeTheDefeatMessage: numberOfGuesses === MAX_GUESSES_COUNT
                })
            )
        )(`a defeat message should appear if the player makes incorrect guesses ${MAX_GUESSES_COUNT} times`,
            ({numberOfGuesses, shouldSeeTheDefeatMessage}) => {
                test(`therefore, for ${numberOfGuesses} guess(es) a defeat message should ${shouldSeeTheDefeatMessage ? "" : "not"} appear`, async () => {
                    for (let i = 0; i < numberOfGuesses; i++) {
                        await playerTypesAndSubmitsGuess("WRONG")
                    }

                    if (shouldSeeTheDefeatMessage) {
                        expect(screen.queryByText(DEFEAT_MESSAGE)).toBeInTheDocument()
                    } else {
                        expect(screen.queryByText(DEFEAT_MESSAGE)).not.toBeInTheDocument()
                    }
                })
            })

        test("no end-of-game message appears if the user has not yet made a guess", async () => {
            expect(screen.queryByText(VICTORY_MESSAGE)).not.toBeInTheDocument()
            expect(screen.queryByText(DEFEAT_MESSAGE)).not.toBeInTheDocument()
        })
    })

    describe("Rules for defining the word of the day", () => {
        beforeEach(() => {
            console.warn = vi.fn()
        })

        test.each(
            [
                {wordOfTheDay: "FLY", reason: "word-of-the-day must have 5 characters"},
                {wordOfTheDay: "tests", reason: "word-of-the-day must be all in uppercase"},
                {wordOfTheDay: "QWERT", reason: "word-of-the-day must be a valid English word"}
            ]
        )("Since $reason: $wordOfTheDay is invalid, therefore a warning must be emitted", async ({wordOfTheDay}) => {
            mount(WordleBoard, {props: {wordOfTheDay}})

            expect(console.warn).toHaveBeenCalled()
        })

        test("no warning is emitted if the word of the day provided is a real uppercase English word with 5 characters", async () => {
            mount(WordleBoard, {props: {wordOfTheDay: "TESTS"}})

            expect(console.warn).not.toHaveBeenCalled()
        })
    })

    describe("Player input", () => {
        test.skip("remains in focus the entire time", async () => {
            // TODO: Investigate why <body> is focused at the start of test when using Testing Library
            expect(screen.getByRole("textbox")).toHaveFocus()

            await user.tab()

            expect(screen.getByRole("textbox")).toHaveFocus()
        })

        test("the input gets cleared after each submission", async () => {
            await playerTypesAndSubmitsGuess("WRONG")

            expect(screen.queryByDisplayValue("WRONG")).not.toBeInTheDocument()
        })

        test(`player guesses are limited to ${WORD_SIZE} letters`, async () => {
            await playerTypesAndSubmitsGuess(wordOfTheDay + "EXTRA")

            expect(screen.queryByText(VICTORY_MESSAGE)).toBeInTheDocument()
        })

        test("player guesses can only be submitted if they are real words", async () => {
            await playerTypesAndSubmitsGuess("QWERT")

            expect(screen.queryByText(VICTORY_MESSAGE)).not.toBeInTheDocument()
            expect(screen.queryByText(DEFEAT_MESSAGE)).not.toBeInTheDocument()
        })

        test("player guesses are not case-sensitive", async () => {
            await playerTypesAndSubmitsGuess(wordOfTheDay.toLowerCase())

            expect(screen.queryByText(VICTORY_MESSAGE)).toBeInTheDocument()
        })

        test("player guesses can only contain letters", async () => {
            await playerTypesGuess("H3!RT")

            expect(screen.queryByDisplayValue("HRT")).toBeInTheDocument()
        })

        test("non-letter characters do not render on the screen while being typed", async () => {
            await playerTypesGuess("12")
            await playerTypesGuess("123")

            expect(screen.queryByDisplayValue("12")).not.toBeInTheDocument()
            expect(screen.queryByDisplayValue("123")).not.toBeInTheDocument()
        })

        test("the player loses control after the max amount of guesses have been sent", async () => {
            const guesses = [
                "WRONG",
                "GUESS",
                "HELLO",
                "WORLD",
                "HAPPY",
                "CODER"
            ]

            for (const guess of guesses) {
                await playerTypesAndSubmitsGuess(guess)
            }

            expect(screen.queryByRole<HTMLInputElement>("textbox")).toBeDisabled()
        })

        test("the player loses control after the correct guess has been given", async () => {
            await playerTypesAndSubmitsGuess(wordOfTheDay)

            expect(screen.queryByRole<HTMLInputElement>("textbox")).toBeDisabled()
        })
    })

    test("all previous guesses done by the player are visible in the page", async () => {
        const guesses = [
            "WRONG",
            "GUESS",
            "HELLO",
            "WORLD",
            "HAPPY",
            "CODER"
        ]

        for (const guess of guesses) {
            await playerTypesAndSubmitsGuess(guess)
        }

        for (const guess of guesses) {
            for (const letter of guess) {
                expect(screen.queryAllByText(letter, {exact: true})).not.toBeNull()
            }
        }
    })

    describe(`there should always be exactly ${MAX_GUESSES_COUNT} guess-views in the board`, async () => {
        test(`${MAX_GUESSES_COUNT} guess-views are present at the start of the game`, async () => {
            expect(screen.getAllByTestId('guess-view')).toHaveLength(MAX_GUESSES_COUNT)
        })

        test(`${MAX_GUESSES_COUNT} guess-views are present when the player wins the game`, async () => {
            await playerTypesAndSubmitsGuess(wordOfTheDay)

            expect(screen.getAllByTestId('guess-view')).toHaveLength(MAX_GUESSES_COUNT)
        })

        test(`${MAX_GUESSES_COUNT} guess-views are present as the player loses the game`, async () => {
            const guesses = [
                "WRONG",
                "GUESS",
                "HELLO",
                "WORLD",
                "HAPPY",
                "CODER"
            ]

            for (const guess of guesses) {
                await playerTypesAndSubmitsGuess(guess)
                expect(screen.getAllByTestId('guess-view')).toHaveLength(MAX_GUESSES_COUNT)
            }
        })
    })

    describe("Displaying hints/feedback to the player", () => {
        test("hints are not displayed until the player submits their guess", async () => {
            cleanup();
            const {container} = render(WordleBoard, {props: {wordOfTheDay}})
            expect(container.querySelector("[data-letter-feedback]"), "Feedback was being rendered before the player started typing their guess").not.toBeInTheDocument()

            await playerTypesGuess(wordOfTheDay)
            expect(container.querySelector("[data-letter-feedback]"), "Feedback was rendered while the player was typing their guess").not.toBeInTheDocument()

            await playerPressesEnter()
            expect(container.querySelector("[data-letter-feedback]"), "Feedback was not rendered after the player submitted their guess").toBeInTheDocument()
        })

        describe.each([
            {
                position: 0,
                expectedFeedback: "correct",
                reason: "W is the first letter of 'WORLD' and 'WRONG'"
            },
            {
                position: 1,
                expectedFeedback: "almost",
                reason: "R exists in both words, but it is in position '2' of 'WORLD'"
            },
            {
                position: 2,
                expectedFeedback: "almost",
                reason: "O exists in both words, but it is in position '1' of 'WORLD'"
            },
            {
                position: 3,
                expectedFeedback: "incorrect",
                reason: "N does not exist in 'WORLD'"
            },
            {
                position: 4,
                expectedFeedback: "incorrect",
                reason: "G does not exist in 'WORLD'"
            }
        ])("If the word of the day is 'WORLD' and the player types 'WRONG'", ({position, expectedFeedback, reason}) => {
            const wordOfTheDay = "WORLD"
            const playerGuess = "WRONG"

            test(`the feedback for '${playerGuess[position]}' (index: ${position}) should be '${expectedFeedback}' because '${reason}'`, async () => {
                cleanup()
                const {container} = render(WordleBoard, {props: {wordOfTheDay}});

                await playerTypesAndSubmitsGuess(playerGuess)


                const actualFeedback = container.querySelectorAll("[data-letter]").item(position).getAttribute("data-letter-feedback")

                expect(actualFeedback).toEqual(expectedFeedback)
            })
        })
    })
})









