import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'Bodhi API',
    description: 'Auto-generated Swagger API documentation for Bodhi backend',
  },
  host: 'localhost:8000',
  schemes: ['http'],
};

const outputFile = './swagger-output.json';
const routes = ['./src/app.ts'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen()(outputFile, routes, doc).then(() => {
    console.log('Swagger documentation generated successfully.');
});
