# Laundry-Booking-API

This is the laundry booking application's API backend project. The purpose of this project is to provide the backend functionalities that facilitate building a web based laundry pass booking solution.

## Used tools

The following software were used during the course of development:

- Version control (Git)
- JavaScript runtime environment (Node.js)
- Project and package management (npm)
- Automatic restarts when files change (nodemon)
- Code editor (Visual Studio Code)
- Static analysis (ESLint)

## Frameworks

The following frameworks/libraries were used in this project:

- express
- express-validator
- express-rate-limit
- bcrypt
- dotenv-safe
- cross-env
- body-parser
- cookie-parser
- cors
- dayjs
- jsonwebtoken
- pg
- swedish-personal-identity-number-validator
- validator
- winston

## Installation

- Install the latest LTS version of [Node.js](https://nodejs.org/), (Node.js v16.14.2 was used for the development of this project).
- Clone this repository.
- Install all the required dependencies using npm by running the command `npm install` in the base directory.

## Starting the application

This project only contains the REST API backend for the laundry booking project, thus provides no client. The API endpoints can be called and tested using a REST client, for example [Insomnia](https://insomnia.rest/) or [Postman](https://www.postman.com/).

1. Make a copy of the file .env.example and call it .env
2. Edit the .env file and enter the proper values for each field.
3. Make sure that the Postgres database is running and correctly set up.
4. Start the application by running the command `npm run start-dev` to start the application in the development mode, or `npm run start` to start the application in the production mode.
5. Start Insomnia.
6. Import the file `insomnia-laundry-api-requests.json` which contains sample requests to all the available api endpoints in this project.

## Deployment to the cloud

The following steps describe the deployment process of the `Laundry-Booking-API` project to Heroku's cloud service.

1. Create a free account on Heroku's cloud platform [Heroku](https://heroku.com/).
2. Install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) tool.
3. Login to Heroku using the CLI by typing `heroku login` in a shell terminal.
4. Download the latest version of the `Laundry-Booking-API` project locally.
5. Start a new shell instance and change the directory to the local directory of the `Laundry-Booking-API` project.
6. Initialize a new Git repository using the command `git init`.
7. Create a new file called `Procfile` and write `web: node src/server.js` to it and save the file.
8. Create and edit the .env file according to the .env.example and fill it with the needed information (VERY IMPORTANT).
9. Edit the `.gitignore` to prevent the exclusion of the .env file (VERY IMPORTANT).
10. Add all files to the local Git repository using `git add .`.
11. Commit the changes to the repository using the command `git commit -m "Commit message goes here!"`.
12. Create a new Heroku project using the command `heroku create --region eu` in the shell terminal.
13. Push the changes to the newly created Heroku project repository using the command `git push heroku master`.
14. The deployment process might take few minutes, and once the deployment is complete, a link to the deployed project will be presented in the shell terminal.
15. The status and the logs of the project can be viewed on Heroku's online dashboard or using the command `heroku logs -n 200` in a shell terminal.

## Static analysis

In order to run static analysis check on the project, do the following:

- Run the command `npm run escheck` in order to run a static analysis check on the project using ESLint (This WILL NOT attempt to fix any problems).
- Run the command `npm run esfix` in order to run a static analysis check on the project using ESLint and attempt to fix problems that might be fixable (This may sometimes result in unwanted code changes, use with caution).


## More Documentation

All the public definitions in this project are documented to provide a greater understanding of each part of the project.
