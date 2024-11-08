import dedent from "ts-dedent";

export function getSceneTemplate() {
	return dedent /* ts */`
    import { Scene } from "@gramio/scenes";

    export const greetingScene = new Scene("greeting")
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
    
            if(!context.text || !Number(context.text)) return context.send("Please write you age correctly")

            return context.scene.update({
                age: context.text
            });
        }).step("message", async (context) => {
           
            await context.send(\`Nice to meet you! I now know that your name is \${context.scene.state.name} and you are \${context.scene.state.age} years old.\`);

            return context.scene.exit();
        });`;
}
