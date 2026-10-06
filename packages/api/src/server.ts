import express, {
    type Express
} from 'express';

import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import swaggerUI from 'swagger-ui-express';

import {
    API$Enumerators,
    type API$Types
} from '@Madeirense/shared';

import { getAPIDocs } from './lib/swagger.js';

import { activateEvents } from './middlewares/events.js';

import passport from './middlewares/passport.js';

import routes from './routes/index.js';

import env from './env.js';

// ***************************************************************************************************************

const allowedOrigins = env.CORS_ORIGIN_WHITE_LIST;

class Server {
    private static instance: Server;
    private port: number = env.PORT;

    protected app: Express = express();

    constructor() {
        this.setupMiddlewares();
        this.applySettings();
        this.configureRouters();
    }

    private setupMiddlewares() {
        //TODO: Setup all middlewares here.
        this.app.use(activateEvents as any);

        this.app.use(compression() as any);

        this.app.use(cors({
            origin: function (origin, callback) {
                if ([
                    !origin,
                    allowedOrigins.includes(origin ?? ''),
                    env.CORS_ALLOW_ALL,
                    (env.NODE_ENV === 'development') && (allowedOrigins.length === 0)
                ].includes(true)) {
                    callback(null, true);
                }

                else {
                    console.log('CORS blocked origin:', origin);

                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'PATCH', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', API$Enumerators.Headers.platform]
        }));

        this.app.use(express.json({ limit: '10mb' }));

        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        this.app.use(helmet());

        this.app.use(morgan('combined'));

        this.app.use(session({
            secret: env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: (env.NODE_ENV === 'production'),
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            }
        }) as any);

        this.app.use(passport.initialize() as any);
        this.app.use(passport.session());

        switch (env.NODE_ENV) {
            case 'production':
                const limiter = rateLimit({
                    windowMs: 15 * 60 * 1000, // 15 minutes
                    max: 100,
                    message: {
                        success: false,
                        message: 'Too many requests from this IP, please try again later.'
                    }
                });

                this.app.use(limiter as any);
                break;

            default:
                break;
        }
    }

    private applySettings() {
        //TODO: Check additional settings this server might need.
        this.app.set('port', this.port);
    }

    private configureRouters() {
        this.app.use('/api', routes.v1.base);

        this.app.use('/api/docs', swaggerUI.serve as any, swaggerUI.setup(getAPIDocs()) as any);

        this.app.use('/api/v1/auth', routes.v1.auth);
        this.app.use('/api/v1/cart', routes.v1.cart);
        this.app.use('/api/v1/comments', routes.v1.comments);
        this.app.use('/api/v1/coupons', routes.v1.coupons);
        this.app.use('/api/v1/courier-positions', routes.v1['courier-positions']);
        this.app.use('/api/v1/delivery-locations', routes.v1['delivery-locations']);
        this.app.use('/api/v1/device-tokens', routes.v1['device-tokens']);
        this.app.use('/api/v1/emis', routes.v1.emis);
        this.app.use('/api/v1/global-settings', routes.v1['global-settings']);
        this.app.use('/api/v1/legal', routes.v1.legal);
        this.app.use('/api/v1/orders', routes.v1.orders);
        this.app.use('/api/v1/payments', routes.v1.payments);
        this.app.use('/api/v1/products', routes.v1.products);
        this.app.use('/api/v1/push-notifications', routes.v1['push-notifications']);
        this.app.use('/api/v1/resorts', routes.v1.resorts);
        this.app.use('/api/v1/restaurant-events', routes.v1['restaurant-events']);
        this.app.use('/api/v1/restaurants', routes.v1.restaurants);
        this.app.use('/api/v1/reviews', routes.v1.reviews);
        this.app.use('/api/v1/routing', routes.v1.routing);
        this.app.use('/api/v1/statistics', routes.v1.statistics);
        this.app.use('/api/v1/users', routes.v1.users);

        this.app.all('/*splat', (request, response) => {
            response.status(404).json({
                data: undefined,
                httpStatus: 404,
                message: 'Route not found',
                success: false
            } as API$Types.response<undefined, 'NOT-FOUND'>)
        });
    }

    public static getInstance(): Server {
        if (!Server.instance) {
            Server.instance = new Server();
        }

        return Server.instance;
    }

    public init() {
        this.app.listen(this.app.get('port'));

        console.log(`===================================================================================================`);
        console.log(`The logo goes here`);
        console.log(`===================================================================================================`);

        console.log(``);
        console.log(``);

        console.log(`***`);
        console.log(``);
        console.log(``);

        console.log(`> URL: ${env.API_URL}`);
        //TODO: Update the version on each release.
        console.log(`> Version: 0.1.0`);
        console.log(`> Environment: ${env.NODE_ENV}`);
        console.log(`> Listening on port: ${this.app.get('port')}`);
        console.log(`> Docs @ ${env.API_URL}/docs`);

        console.log(`> Description:`);
        //TODO: Add an API description below.
        console.log(`  This API serves the general purpose of managing the business logic between the database, and user end-point applications such as the web/mobile versions.`);
        console.log(``);
        console.log(`  Versions (:VERSION:) > ${Object.keys(routes).join(', ')}`);
        console.log(`  Endpoints:`);
        Object.keys(routes.v1).forEach(endpoint => console.log(`  @ ${env.API_URL}/:VERSION:/${endpoint}`));

        console.log(``);
        console.log(``);
        console.log(`***`);

        console.log(``);
        console.log(``);
    }
};

Server.getInstance().init();