# Changelog

## [0.1.2](https://github.com/kuon-bui/invitation-be/compare/invitation-backend-v0.1.1...invitation-backend-v0.1.2) (2026-10-21)


### Bug Fixes

* **compose:** update postgres volume path and remove unused volume declaration ([#11](https://github.com/kuon-bui/invitation-be/issues/11)) ([f29b37a](https://github.com/kuon-bui/invitation-be/commit/f29b37a9ff3a7db5e19de89b4c68ccc91fca2c92))

## [0.1.1](https://github.com/kuon-bui/invitation-be/compare/invitation-backend-v0.1.0...invitation-backend-v0.1.1) (2026-10-21)


### Miscellaneous Chores

* release 0.1.1 ([5194aad](https://github.com/kuon-bui/invitation-be/commit/5194aadc95a056eabdaf886c89ad31602fe48e8a))

## [0.1.0](https://github.com/kuon-bui/invitation-be/compare/invitation-backend-v0.0.1...invitation-backend-v0.1.0) (2026-10-21)


### Features

* **auth:** implement JWT authentication, user registration and roles guard ([4de9525](https://github.com/kuon-bui/invitation-be/commit/4de9525c1d96caf57d3d8493c448238c6fbddb60))
* **backend:** initialize NestJS project and configure Prisma schema with pnpm ([08e1adb](https://github.com/kuon-bui/invitation-be/commit/08e1adb7fe6ac32adbe2a8c98a698cf88eaa4e3d))
* **guests:** implement guest list management with Excel import and export ([f16a329](https://github.com/kuon-bui/invitation-be/commit/f16a3290f6d5164f2f9b87a08e91e2e958fd0b9f))
* **invitations:** add public trial invitation endpoint and auto guest mapping ([#2](https://github.com/kuon-bui/invitation-be/issues/2)) ([b6652cd](https://github.com/kuon-bui/invitation-be/commit/b6652cd8f6b058248ed9b095c6b54e46932938ba))
* **invitations:** implement core invitation management and public slug caching ([ff97148](https://github.com/kuon-bui/invitation-be/commit/ff97148d4d9593cdaa1906034285e9ceeb7e569e))
* **media:** implement S3 and Cloudflare R2 presigned URL generator ([2be3920](https://github.com/kuon-bui/invitation-be/commit/2be3920aac57b01a18388291bb02aa73981cb130))
* **notifications:** implement event listeners for Telegram bot and Email ([97d8532](https://github.com/kuon-bui/invitation-be/commit/97d8532455a5e8ca8926e226fed8df6e49ef6b50))
* **package:** add vercel-build script for deployment process ([5a30381](https://github.com/kuon-bui/invitation-be/commit/5a30381b7d34f4360e7ade76f0a8ce244cff66e5))
* **payments:** add public-invoice endpoint and detailed bank fields for frontend ([#1](https://github.com/kuon-bui/invitation-be/issues/1)) ([a46a62d](https://github.com/kuon-bui/invitation-be/commit/a46a62d13859461f9368afee7939c02130980449))
* **payments:** implement SePay VietQR payment webhook and automated activation ([e2d1794](https://github.com/kuon-bui/invitation-be/commit/e2d17941f49255ed7df288db1515b589087777d9))
* **rsvp-wishes:** implement RSVP submissions, guestbook wishes and events ([efa0f6e](https://github.com/kuon-bui/invitation-be/commit/efa0f6e2b8231c41a75a594b554d101a714ac075))
* **templates:** add admin list endpoint and enable cors in main ([11817b3](https://github.com/kuon-bui/invitation-be/commit/11817b3a843fb529e8d3298a874cd670f7040e0e))
* **templates:** implement template management with JSON config schema ([7fd6403](https://github.com/kuon-bui/invitation-be/commit/7fd640372cd99f3084e19a68ee1a4c70e80a4d5a))


### Bug Fixes

* **package:** correct vercel-build script to use nest build instead of next build ([6ea8aa7](https://github.com/kuon-bui/invitation-be/commit/6ea8aa7d01bde5be4ae3fc90230d6900b5be4431))
