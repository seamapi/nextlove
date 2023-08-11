import chalk from 'chalk';
import {createInterface} from 'readline'

export async function askQuestion(query: string, choices: string[]): Promise<string> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(`${query} (${choices.join(', ')}): `, (answer) => {
            rl.close();

            if (choices.includes(answer)) {
                resolve(answer);
            } else {
                console.log(chalk.red('\nInvalid choice. Please choose from the provided options.'));
                resolve(askQuestion(query, choices));
            }
        });
    });
}