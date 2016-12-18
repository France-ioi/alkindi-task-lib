
Support library used in tasks for the Alkindi competition.

### Development

Install with these commands:

```
git clone https://github.com/France-ioi/alkindi-task-lib.git
cd alkindi-task-lib
npm install
jspm install
```

Run `npm run build-dev` run as you edit the source files (in `lib/`) to
update the transpiled files (in `dist/`) automatically.

To make use of the local copy of the library, run the following command
(adjusting the path if necessary) inside the task package:

```
jspm link ../alkindi-task-lib
```
