process.env.PORT = 0; // Use random ports during tests

const { ServiceBroker } = require("moleculer");
const ApiGateway = require("moleculer-web");

const Openapi = require("../index");

const OpenapiService = {
  mixins: [Openapi],
  settings: {
    openapi: {
      "info": {
        "description": "Foo",
        "title": "Bar",
      },
    },
  },
};

const SomeService = {
  name: "some",
  actions: {
    upload: {
      openapi: {
        responses: {
          200: {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "example": { id: 1, filename: 'foo.txt', mimetype: 'text/plain', sizeInBytes: 100 },
                  },
                },
              },
            },
          },
          400: {
            $ref: "#/components/responses/FileNotExist",
          },
          401: {
            $ref: "#/components/responses/UnauthorizedError",
          },
          413: {
            $ref: "#/components/responses/FileTooBig",
          },
          422: {
            $ref: "#/components/responses/ValidationError",
          },
          default: {
            $ref: "#/components/responses/ServerError",
          },
        },
      },
      handler() {},
    },
    update: {
      openapi: {
        summary: "Foo bar baz",
      },
      params: {
        $$strict: "remove",
        id: { type: "number", convert: true },
        numberBy: "number",
        someNum: { $$t: "Is some num", type: "number", convert: true },
        types: {
          type: "array",
          $$t: "Types arr",
          items: {
            type: "object", strict: "remove", props: {
              id: { type: "number", optional: true },
              typeId: { type: "number", optional: true },
            },
          },
        },
        bars: {
          type: "array",
          $$t: "Bars arr",
          min: 1,
          items: {
            type: "object", strict: "remove", props: {
              id: { type: "number", optional: true },
              fooNum: { $$t: "fooNum", type: "number", optional: true },
            },
          },
        },
        someObj: {
          $$t: "Some obj",
          type: "object", strict: "remove", props: {
            id: { $$t: "Some obj ID", type: "number", optional: true },
            numberId: { type: "number", optional: true },
            name: { type: "string", optional: true, max: 100 },
          },
        },
        someBool: { type: "boolean", optional: true },
        desc: { type: "string", optional: true, max: 10000 },
      },
      handler() {},
    },
    /**
     * Action from moleculer-db mixin
     */
    find: {
      cache: {
        keys: ["populate", "fields", "limit", "offset", "sort", "search", "searchFields", "query"],
      },
      params: {
        populate: [
          { type: "string", optional: true },
          { type: "array", optional: true, items: "string" },
        ],
        fields: [
          { type: "string", optional: true },
          { type: "array", optional: true, items: "string" },
        ],
        limit: { type: "number", integer: true, min: 0, optional: true, convert: true },
        offset: { type: "number", integer: true, min: 0, optional: true, convert: true },
        sort: { type: "string", optional: true },
        search: { type: "string", optional: true },
        searchFields: [
          { type: "string", optional: true },
          { type: "array", optional: true, items: "string" },
        ],
        query: [
          { type: "object", optional: true },
          { type: "string", optional: true },
        ],
      },
      handler() {},
    },
  },
};

const ApiService = {
  name: "api",
  mixins: [ApiGateway],
  settings: {
    routes: [
      {
        path: "/api",
        aliases: {
          "POST login-custom-function": {
            handler(req, res) {
              res.end();
            },
            openapi: {
              summary: "Login",
              tags: ["auth"],
              requestBody: {
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      example: { login: "", pass: "" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        path: "/api",
        aliases: {
          "PUT upload": "multipart:some.upload",
          "PATCH update/:id": "some.update",
          "GET find": {
            openapi: {
              summary: "Some find summary",
            },
            action: "some.find",
          },
        },
      },
      {
        path: "/api",
        whitelist: ["openapi.*"],
        autoAliases: true,
      },
    ],
  },
};

describe("Test 'openapi' mixin", () => {
  const broker = new ServiceBroker({ logger: false });
  broker.createService(SomeService);
  broker.createService(OpenapiService);
  broker.createService(ApiService);

  beforeAll(async () => {
    await broker.start();

    // wait for all services auto resolved
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  afterAll(() => broker.stop());

  it("generate schema json file", async () => {
    expect.assertions(1);

    const json = await broker.call("openapi.generateDocs");

    const expectedSchema = require("./expectedSchema.json");

    // check json https://editor.swagger.io/
    //console.log(JSON.stringify(json, null, ""));
    expect(json).toMatchObject(expectedSchema);
  });
});
