import { runCli } from './cli/program';
import { loadConfig } from './config';
import { createContainer } from './container';

const main = async (): Promise<number> => {
  const container = createContainer(loadConfig(process.env));
  try {
    return await runCli(process.argv.slice(2), container, {
      out: (line) => console.log(line),
      err: (line) => console.error(line),
    });
  } finally {
    container.close();
  }
};

main().then(
  (exitCode) => {
    process.exitCode = exitCode;
  },
  (error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  },
);
