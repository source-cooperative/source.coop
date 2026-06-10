# Changelog

## [2.0.0](https://github.com/source-cooperative/source.coop/compare/v1.3.0...v2.0.0) (2026-06-10)


### ⚠ BREAKING CHANGES

* require auth for restricted products ([#284](https://github.com/source-cooperative/source.coop/issues/284))

### Features

* add X-Robots-Tag header for non-production deployments ([72249b9](https://github.com/source-cooperative/source.coop/commit/72249b91a86de74cbf285e161ca0ab7809c68844)), closes [#302](https://github.com/source-cooperative/source.coop/issues/302)
* add X-Robots-Tag header for non-production deployments ([#323](https://github.com/source-cooperative/source.coop/issues/323)) ([4fa9f9d](https://github.com/source-cooperative/source.coop/commit/4fa9f9db692a2f283bcc03399b84b4d4d1ce3a13))
* **admin:** admin email-to-profile lookup view ([#350](https://github.com/source-cooperative/source.coop/issues/350)) ([a056a28](https://github.com/source-cooperative/source.coop/commit/a056a2818f3f6f9d5855113496eb5f37d514427d))
* **profile:** link to Ory settings from read-only email field ([#349](https://github.com/source-cooperative/source.coop/issues/349)) ([34a2244](https://github.com/source-cooperative/source.coop/commit/34a224446d39d3606abbe70544d3f51f68c1b2bd))
* **viewer:** Add PDF viewer, PNG bindings ([#315](https://github.com/source-cooperative/source.coop/issues/315)) ([7927431](https://github.com/source-cooperative/source.coop/commit/7927431815971f9d6e11b5ab25164835cf151c70))


### Bug Fixes

* **email-verification:** reconcile Ory verification on every page load ([#347](https://github.com/source-cooperative/source.coop/issues/347)) ([e0a85c3](https://github.com/source-cooperative/source.coop/commit/e0a85c379b20b57481a93d81d8f39dc0fd3122d4))
* make full menu item area clickable ([#295](https://github.com/source-cooperative/source.coop/issues/295)) ([e27a3c2](https://github.com/source-cooperative/source.coop/commit/e27a3c23c50b264b0cc0897ce87b785ec8cbefac))
* re-render auth UI after form-submission redirects ([#344](https://github.com/source-cooperative/source.coop/issues/344)) ([a378ebc](https://github.com/source-cooperative/source.coop/commit/a378ebc1a523eaaed80eca803283056a57e01db4))
* require auth for restricted products ([#284](https://github.com/source-cooperative/source.coop/issues/284)) ([112265a](https://github.com/source-cooperative/source.coop/commit/112265aea73a84a364d0843ff7798124a5f65f14))
* return user to current view after login ([#346](https://github.com/source-cooperative/source.coop/issues/346)) ([9dd6d5f](https://github.com/source-cooperative/source.coop/commit/9dd6d5f923237a2f79517c5f7a917609c964ecb4))
* validate product DOI format ([#319](https://github.com/source-cooperative/source.coop/issues/319)) ([4727dec](https://github.com/source-cooperative/source.coop/commit/4727dec6f267619aef7a8ab8886c88e9b182a24c))


### Performance Improvements

* **db:** request-scoped memoization of DynamoDB reads ([#320](https://github.com/source-cooperative/source.coop/issues/320)) ([1f295cf](https://github.com/source-cooperative/source.coop/commit/1f295cf18e0cf451d3ef328fb23d4316cf15dbec))

## [1.3.0](https://github.com/source-cooperative/source.coop/compare/v1.2.0...v1.3.0) (2026-05-13)


### Features

* Add custom COG viewer ([#303](https://github.com/source-cooperative/source.coop/issues/303)) ([8337407](https://github.com/source-cooperative/source.coop/commit/833740729e0cce55c6981a6293968b52308fcb20)), closes [#169](https://github.com/source-cooperative/source.coop/issues/169)
* add ROR ID field to organization profile edit form ([#280](https://github.com/source-cooperative/source.coop/issues/280)) ([00f3ff8](https://github.com/source-cooperative/source.coop/commit/00f3ff8c22a91bc0347e75e20a77f8edc6645964))
* add schema.org Dataset metadata to product pages ([#281](https://github.com/source-cooperative/source.coop/issues/281)) ([fb1efa5](https://github.com/source-cooperative/source.coop/commit/fb1efa5c8549c2bc6fa46c64b0a9e094697b9671))
* add schema.org Person/Organization metadata to account pages ([#282](https://github.com/source-cooperative/source.coop/issues/282)) ([dbf19c7](https://github.com/source-cooperative/source.coop/commit/dbf19c7100d34807739ebe64f1103f3ffed728e8))
* viewer for STAC & JSON ([#200](https://github.com/source-cooperative/source.coop/issues/200)) ([476d3d2](https://github.com/source-cooperative/source.coop/commit/476d3d27fe565e805508ecea1bf17984368ec1d9))


### Bug Fixes

* Escape special characters in schema.org JSON-LD metadata ([#305](https://github.com/source-cooperative/source.coop/issues/305)) ([a904d6c](https://github.com/source-cooperative/source.coop/commit/a904d6c2b790738d6b282a4ed34e92e7099b1934))

## [1.2.0](https://github.com/source-cooperative/source.coop/compare/v1.1.1...v1.2.0) (2026-04-01)


### Features

* add city country to globe labels ([#276](https://github.com/source-cooperative/source.coop/issues/276)) ([5f97d7c](https://github.com/source-cooperative/source.coop/commit/5f97d7c741dba49869961aa991811b6263872431))


### Bug Fixes

* Update Bridges to Prosperity to Fika ([#264](https://github.com/source-cooperative/source.coop/issues/264)) ([f67b4f3](https://github.com/source-cooperative/source.coop/commit/f67b4f32dbe570b20c6859cebe999634ed672094))

## [1.1.1](https://github.com/source-cooperative/source.coop/compare/v1.1.0...v1.1.1) (2026-03-31)


### Bug Fixes

* smooth transition when loading globe ([4f650b9](https://github.com/source-cooperative/source.coop/commit/4f650b9cf0f3df85aadc6b149cac045ab1c86421))
* smooth transition when loading globe ([#262](https://github.com/source-cooperative/source.coop/issues/262)) ([223dca4](https://github.com/source-cooperative/source.coop/commit/223dca49644279419020afc898e58df78a688eaa))

## [1.1.0](https://github.com/source-cooperative/source.coop/compare/v1.0.0...v1.1.0) (2026-03-31)


### Features

* 3d globe + req locations ([#254](https://github.com/source-cooperative/source.coop/issues/254)) ([a2e7026](https://github.com/source-cooperative/source.coop/commit/a2e70260b7c39fb0904ac939710ecdecbf5d980a))
* combine /featured and /products ([#251](https://github.com/source-cooperative/source.coop/issues/251)) ([2d6d99e](https://github.com/source-cooperative/source.coop/commit/2d6d99e4fdd64dea91ea5c29e401702b06a50648))
* enhance getFeaturedProducts to filter featured items directly in listPublic ([08b4363](https://github.com/source-cooperative/source.coop/commit/08b43635b18c400ae3436dbe36510f10c705cb81))
* landing page ([#242](https://github.com/source-cooperative/source.coop/issues/242)) ([341d8de](https://github.com/source-cooperative/source.coop/commit/341d8deba1e0532fc87001548eeaf4c4091eab0b))


### Bug Fixes

* adjust grid column min-width to be responsive ([ef2d3c8](https://github.com/source-cooperative/source.coop/commit/ef2d3c88bd1dfc997cc7ebfeb9da67206d005aad))
* adjust grid column min-width to be responsive ([#246](https://github.com/source-cooperative/source.coop/issues/246)) ([3e908ca](https://github.com/source-cooperative/source.coop/commit/3e908ca9bbc68c6d8f211b04ed96cde61fe782f6))
* adjust item layout for better spacing and alignment ([#243](https://github.com/source-cooperative/source.coop/issues/243)) ([dd30234](https://github.com/source-cooperative/source.coop/commit/dd30234aa9460c3b2dda89fc347c8689bd10311b))
* correct featured products list ([#244](https://github.com/source-cooperative/source.coop/issues/244)) ([0dadcbb](https://github.com/source-cooperative/source.coop/commit/0dadcbbdc6e71bd7281faad0c82aa178bb2069c4))
* create search_text field for performant search ([#256](https://github.com/source-cooperative/source.coop/issues/256)) ([d6b766d](https://github.com/source-cooperative/source.coop/commit/d6b766d76119210b19d2c6fba37c7b981c197fac))
* implement pagination for products list and enhance filtering opt… ([#255](https://github.com/source-cooperative/source.coop/issues/255)) ([3c0e0ec](https://github.com/source-cooperative/source.coop/commit/3c0e0ec334b69cc3b3c735fd719e152ba962ddbe))
* initialize search and tags input state from URL parameters ([#247](https://github.com/source-cooperative/source.coop/issues/247)) ([7bc39d8](https://github.com/source-cooperative/source.coop/commit/7bc39d8e17adc540dfb6c661797efefa8b316818))
* make "Explore the data" button a link ([970de60](https://github.com/source-cooperative/source.coop/commit/970de607404b9316461019a5b73b727f1cce22fd))
* preserve full URL path when saving account websites ([#238](https://github.com/source-cooperative/source.coop/issues/238)) ([f5dbad1](https://github.com/source-cooperative/source.coop/commit/f5dbad170b94efa0fd3fbd176789ca4b6f006740))

## Changelog
