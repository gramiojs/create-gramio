import dedent from "ts-dedent";

export function getSceneTemplate() {
	// `.extend(baseComposer)` flows typed derives (t, render, session, …) from
	// the bot-level composer into every `.step(...)` handler. `baseComposer` is
	// named + `.as("scoped")`, so registration-time dedup runs its middleware
	// once per update even though both the bot and every scene extend it.
	// See scene-composer-inheritance pattern for the why behind the split.
	return dedent /* ts */`
    import { Scene } from "@gramio/scenes";
    import { baseComposer } from "../plugins/base.ts";

    export const greetingScene = new Scene("greeting")
        .extend(baseComposer)
        .step("message", (context) => {
            if (context.scene.step.firstTime)
                return context.send("Hi! What's your name?");

            if(!context.text) return context.send("Please write your name")

            return context.scene.update({
                name: context.text
            });
        })
        .step("message", (context) => {
            if (context.scene.step.firstTime)
                return context.send("How old are you?");

            const age = Number(context.text)
            if(!context.text || Number.isNaN(age)) return context.send("Please write you age correctly")

            return context.scene.update({
                age
            });
        }).step("message", async (context) => {

            await context.send(\`Nice to meet you! I now know that your name is \${context.scene.state.name} and you are \${context.scene.state.age} years old.\`);

            return context.scene.exit();
        });`;
}
