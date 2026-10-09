import swaggerJSDoc from 'swagger-jsdoc';

import { 
    API$Enumerators,
    ApplicationStates, 
    onlyType, 
    which,
    type API$Types,
} from '@Madeirense/shared';

import env from 'env';

// ***************************************************************************************************************

const environment = env.NODE_ENV;

const openAPISpec = {
    openapi: '3.0.0',
    info: {
        title: env.APP_NAME,
        version: '0.1.0',
        // TODO: Add project API description.
        description: 'BMA Template swagger docs...'
    },
    servers: [
        {
            url: [
                env.API_URL as string,
                '/api'
            ].join(''),
            description: `(${(which(environment, 'development') as string).toUpperCase()}) API Server`,
        },
    ],
    components: {
        responses: {
            InvalidRequestError: {
                description: 'Invalid data types were sent with the request.',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: {
                                    type: 'boolean',
                                    default: false
                                },
                                message: {
                                    type: 'string',
                                    default: 'Invalid ...'
                                },
                                code: {
                                    type: 'string',
                                    enum: [
                                        'BAD_REQUEST'
                                    ] as API$Types.errorCode[]
                                }
                            }
                        }
                    }
                }
            },
            UnauthorizedError: {
                description: 'Access credentials were\'t supplied via authorization header.',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: {
                                    type: 'boolean',
                                    default: false
                                },
                                message: {
                                    type: 'string',
                                    default: 'Invalid authorization, expected header but none is present'
                                },
                                code: {
                                    type: 'string',
                                    enum: [
                                        'UNAUTHORIZED'
                                    ] as API$Types.errorCode[]
                                }
                            }
                        }
                    }
                }
            },
            UnimplementedError: {
                description: 'The following request is sending data the application isn\'t prepared to implement.',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                success: {
                                    type: 'boolean',
                                    default: false
                                },
                                message: {
                                    type: 'string',
                                    default: 'Cannot handle ...'
                                },
                                code: {
                                    type: 'string',
                                    enum: [
                                        'UNIMPLEMENTED'
                                    ] as API$Types.errorCode[]
                                }
                            }
                        }
                    }
                }
            },
        },
        securitySchemes: {
            basicAuth: {
                type: 'http',
                scheme: 'basic'
            },
            // Added 2026-10-08 — see middlewares/apiKeys.ts. Generate one at /api/management.
            apiKey: {
                type: 'apiKey',
                in: 'header',
                name: API$Enumerators.Headers['api-key']
            }
        },
        schemas: {
            APIResponse: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string'
                    },
                    success: {
                        type: 'boolean'
                    },
                    code: {
                        type: 'string'
                    },
                    errors: {
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/problem'
                        }
                    },
                    pagination: {
                        $ref: '#/components/schemas/pagination'
                    },
                    status: {
                        type: 'string',
                        enum: Object.values(ApplicationStates).filter(onlyType('string'))
                    },
                    warnings: {
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/problem'
                        }
                    }
                },
                required: [
                    'message',
                    'success'
                ]
            },
            dependency: {
                type: 'object',
                properties: {
                    endpoint: {
                        type: 'string'
                    },
                    essential: {
                        type: 'boolean'
                    },
                    name: {
                        type: 'string'
                    },
                    description: {
                        description: 'A brief summary of what this dependency does or how it\'s being used.',
                        type: 'description'
                    },
                    status: {
                        type: 'string',
                        enum: Object.values(ApplicationStates).filter(onlyType('string'))
                    },
                }
            },
            pagination: {
                type: 'object',
                properties: {
                    page: {
                        type: 'number'
                    },
                    limit: {
                        type: 'number'
                    },
                    total: {
                        type: 'number'
                    },
                    totalPages: {
                        type: 'number'
                    },
                    hasNext: {
                        type: 'boolean'
                    },
                    hasPrevious: {
                        type: 'boolean'
                    }
                }
            },
            problem: {
                type: 'object',
                additionalProperties: {
                    type: 'string'
                }
            },
            PushNotificationSubscription: {
                type: 'object',
                properties: {
                    id: {
                        type: 'number'
                    },
                    user: {
                        type: 'string'
                    },
                    endpoint: {
                        type: 'string'
                    }
                }
            }
        }
    },
    // Applied to every operation; the "Authorize" button in /api/docs sets it for Try-it-out calls.
    security: [
        { apiKey: [] }
    ],
    tags: [
        {
            'name': env.APP_NAME,
            // TODO: Add project API description.
            'description': 'API base operations.'
        },
        {
            'name': 'APIConnect',
            'description': 'Transforms the payload of a HTTP REST request into a SOAP Envelope and forwards it to IIB broker servers, parsing data from an XML response and sending it as JSON.'
        },
    ]
};

export const getAPIDocs = () => {
    const spec = swaggerJSDoc({
        definition: openAPISpec,
        apis: [
            './src/routes/*.js',
            './src/routes/*.ts',
        ]
    });

    // DEBUG: Clear this to debug your docs return.
    // const isVerbosityEnabled = (env.ENABLE_VERBOSITY ?? '') === 'true';
    // if (isVerbosityEnabled) console.warn(
    //     '[WARN] Generated spec | ',
    //     JSON.stringify(spec, null, 4)
    // );

    return spec;
};

// TODO: If this project won't use swagger, IT IS HIGHLY RECOMMENDED THAT IT SHOULD BE USED, remove this library and uninstall 'swagger-jsdocs' and 'swagger-ui-express' from the dependencies.