# Changelog

## [1.4.3](https://github.com/source-cooperative/source.coop/compare/v1.4.2...v1.4.3) (2026-07-22)


### Bug Fixes

* **data-connections:** align provider values to the backend vocabulary ([#455](https://github.com/source-cooperative/source.coop/issues/455)) ([06adc4c](https://github.com/source-cooperative/source.coop/commit/06adc4cc8747038e61d4244ba1961998d27b7b5d))

## [1.4.2](https://github.com/source-cooperative/source.coop/compare/v1.4.1...v1.4.2) (2026-07-21)


### Features

* add external link icon to open data viewers in a new tab ([#418](https://github.com/source-cooperative/source.coop/issues/418)) ([a646bfb](https://github.com/source-cooperative/source.coop/commit/a646bfb23c1982f021acfa57c84de781a006a84c))
* add external link to open data viewer in a new tab ([b3191d7](https://github.com/source-cooperative/source.coop/commit/b3191d772d7126e0eb3be6ff29e94ad8ad0a9317)), closes [#417](https://github.com/source-cooperative/source.coop/issues/417)
* **credentials:** add callout pointing to Source Coop CLI ([#438](https://github.com/source-cooperative/source.coop/issues/438)) ([2002694](https://github.com/source-cooperative/source.coop/commit/2002694c230807bc4a24f14f12c1afa899499417))
* **credentials:** add OS selector for env var format ([#439](https://github.com/source-cooperative/source.coop/issues/439)) ([f5f08ef](https://github.com/source-cooperative/source.coop/commit/f5f08ef3dbb5b758faf07738b91e186c656ed0c9)), closes [#434](https://github.com/source-cooperative/source.coop/issues/434)
* **data-connections:** move prefix template to helptext example ([#446](https://github.com/source-cooperative/source.coop/issues/446)) ([f420486](https://github.com/source-cooperative/source.coop/commit/f4204869fef5bc8fe3ef6f294e74a2b6e2c7ed59))
* **nav:** account-centric dropdown menu ([#404](https://github.com/source-cooperative/source.coop/issues/404)) ([c6e05b7](https://github.com/source-cooperative/source.coop/commit/c6e05b7f5f82b3b3acf6a044e2be3c519733a1f6))
* **nav:** drop dash icons, divide "New product" in account dropdown ([#442](https://github.com/source-cooperative/source.coop/issues/442)) ([da845b1](https://github.com/source-cooperative/source.coop/commit/da845b112eba8263640bc88846a2525e410950f1))
* **nav:** omit disabled products, polish account-dropdown product links ([#447](https://github.com/source-cooperative/source.coop/issues/447)) ([9332a7f](https://github.com/source-cooperative/source.coop/commit/9332a7fc8147a084d6d7943a60217aa373078e37))
* return to current page after logout ([#411](https://github.com/source-cooperative/source.coop/issues/411)) ([c0a75e6](https://github.com/source-cooperative/source.coop/commit/c0a75e6c5ddd18fca29f81e6e7962338a34a8bf0))
* **uploader:** auto-retry uploads on transient network errors ([ff10161](https://github.com/source-cooperative/source.coop/commit/ff10161109d9a2d057acdef2e9ae064a79d1e970)), closes [#425](https://github.com/source-cooperative/source.coop/issues/425)


### Bug Fixes

* automatically retry uploads on transient network errors ([#427](https://github.com/source-cooperative/source.coop/issues/427)) ([58f4625](https://github.com/source-cooperative/source.coop/commit/58f46251faddf7914ddb82380e1f372c21d7d274))
* **login:** refresh return_to on query-only navigation ([#419](https://github.com/source-cooperative/source.coop/issues/419)) ([c98aa1e](https://github.com/source-cooperative/source.coop/commit/c98aa1e866b9dc017f8fc4742772cc2c89f5b388))
* **mirrors:** account-scoped connection links + owner-editable mirror prefix ([#440](https://github.com/source-cooperative/source.coop/issues/440)) ([53c9b68](https://github.com/source-cooperative/source.coop/commit/53c9b686cdcac15eb33f1c7f3c5d5ce68ebed873))
* **mirrors:** allow empty mirror prefix (connection root) ([#448](https://github.com/source-cooperative/source.coop/issues/448)) ([0c6ea54](https://github.com/source-cooperative/source.coop/commit/0c6ea54c33b76b514455a268180fbbe6a59c3ed2))
* **product:** remove object preview loading skeleton ([#420](https://github.com/source-cooperative/source.coop/issues/420)) ([927a14c](https://github.com/source-cooperative/source.coop/commit/927a14c8dec242c1da1bab322a0f7d747af8635b))
* **product:** shorten product page card titles ([#430](https://github.com/source-cooperative/source.coop/issues/430)) ([98d8d2e](https://github.com/source-cooperative/source.coop/commit/98d8d2ef0a390a31b14646896700b8acee90e26d))
* **product:** stop directory-nav skeleton flash ([#449](https://github.com/source-cooperative/source.coop/issues/449)) ([a98d5fa](https://github.com/source-cooperative/source.coop/commit/a98d5fa86a22b3d76a7cd9ede843737faed682be))
* **uploader:** cancel pending auto-retry timers on cancel/clear/retry ([d6535bc](https://github.com/source-cooperative/source.coop/commit/d6535bc31545054478f47976015a3fb0c07533f3))
* **uploader:** include endpoint_url in INI credentials format ([#431](https://github.com/source-cooperative/source.coop/issues/431)) ([f3fe3c0](https://github.com/source-cooperative/source.coop/commit/f3fe3c07430b80adef0f70c7a35a083dc27f96c8))
* **uploader:** show timezone abbreviation on credentials expiration ([3444032](https://github.com/source-cooperative/source.coop/commit/34440324ca0e8b90e7ed973ec1ee6c0fa1f0cd9e)), closes [#424](https://github.com/source-cooperative/source.coop/issues/424)
* **uploader:** show timezone abbreviation on credentials expiration ([#426](https://github.com/source-cooperative/source.coop/issues/426)) ([75c4f79](https://github.com/source-cooperative/source.coop/commit/75c4f79b12f95a73edb945653daa6c063a2bcb8f))
* use full Apache 2.0 license text so GitHub can detect it ([6cd3f36](https://github.com/source-cooperative/source.coop/commit/6cd3f3692f9cc63a43ba53f456e76157bf847a07)), closes [#422](https://github.com/source-cooperative/source.coop/issues/422)
* use full Apache 2.0 license text so GitHub can detect it ([#423](https://github.com/source-cooperative/source.coop/issues/423)) ([8c1b102](https://github.com/source-cooperative/source.coop/commit/8c1b1026d939d0124a4f8cb3c9ee04f49517f33e))


### Miscellaneous Chores

* release 1.4.2 ([318a877](https://github.com/source-cooperative/source.coop/commit/318a877bd42aa9c1641a43eb93f0b0df25761e66))

## [1.4.1](https://github.com/source-cooperative/source.coop/compare/v1.4.0...v1.4.1) (2026-07-03)


### Bug Fixes

* set mock redirect uri ([c64b6b4](https://github.com/source-cooperative/source.coop/commit/c64b6b46d059e582e43f2c7093487646346d78d8))

## [1.4.0](https://github.com/source-cooperative/source.coop/compare/v1.3.0...v1.4.0) (2026-07-01)


### ⚠ BREAKING CHANGES

* require auth for restricted products ([#284](https://github.com/source-cooperative/source.coop/issues/284))

### Features

* add INI-style credentials format tab ([2bcc3f1](https://github.com/source-cooperative/source.coop/commit/2bcc3f17f41aab879ba69bba7b24b02cf38d4e11)), closes [#388](https://github.com/source-cooperative/source.coop/issues/388)
* add INI-style credentials format tab ([#389](https://github.com/source-cooperative/source.coop/issues/389)) ([ebd4a1e](https://github.com/source-cooperative/source.coop/commit/ebd4a1e3adeeb4e346b4ae0f1d1cb98ad3208500))
* add X-Robots-Tag header for non-production deployments ([72249b9](https://github.com/source-cooperative/source.coop/commit/72249b91a86de74cbf285e161ca0ab7809c68844)), closes [#302](https://github.com/source-cooperative/source.coop/issues/302)
* add X-Robots-Tag header for non-production deployments ([#323](https://github.com/source-cooperative/source.coop/issues/323)) ([4fa9f9d](https://github.com/source-cooperative/source.coop/commit/4fa9f9db692a2f283bcc03399b84b4d4d1ce3a13))
* **admin-ui:** trust-policy sub-pattern preview on the federated connection edit page ([#377](https://github.com/source-cooperative/source.coop/issues/377)) ([ba82dc4](https://github.com/source-cooperative/source.coop/commit/ba82dc4ba88c18cfebd1bb4f2bc4d8a151d70822))
* **admin:** admin email-to-profile lookup view ([#350](https://github.com/source-cooperative/source.coop/issues/350)) ([a056a28](https://github.com/source-cooperative/source.coop/commit/a056a2818f3f6f9d5855113496eb5f37d514427d))
* **admin:** data connection management (CRUD, S3/Azure/GCP/R2, product mirrors) ([#364](https://github.com/source-cooperative/source.coop/issues/364)) ([9ca1f53](https://github.com/source-cooperative/source.coop/commit/9ca1f537b56e22bd1c8fc6862fc2d6e27664fd5c))
* **authz:** let product owners view their own deactivated products ([#399](https://github.com/source-cooperative/source.coop/issues/399)) ([09fd4d0](https://github.com/source-cooperative/source.coop/commit/09fd4d046c22ff8b11922a1c3815da1a4e35209d))
* **data-connection:** expose secret-less federated config; never return stored secrets ([#376](https://github.com/source-cooperative/source.coop/issues/376)) ([395b6c2](https://github.com/source-cooperative/source.coop/commit/395b6c23adc27013e9d4b97d5ae9e71ca5c65232))
* **data-connection:** federated backend authentication (AWS web identity + GCP/Azure scaffold) ([#332](https://github.com/source-cooperative/source.coop/issues/332)) ([999a076](https://github.com/source-cooperative/source.coop/commit/999a07650da47e424f1369aacfb51acc928da606))
* **data-connections:** account-owned data connections ([#383](https://github.com/source-cooperative/source.coop/issues/383)) ([b04755b](https://github.com/source-cooperative/source.coop/commit/b04755b566145263fc85aef9237512bb75d7ba4b))
* **data-connections:** expose secret-less federated config by connection visibility ([#327](https://github.com/source-cooperative/source.coop/issues/327)) ([#339](https://github.com/source-cooperative/source.coop/issues/339)) ([43f1f63](https://github.com/source-cooperative/source.coop/commit/43f1f63c8906b0ce658bd46b8aa2d2977bf0ca99))
* **data-connections:** link product-owned connections to admin form ([#392](https://github.com/source-cooperative/source.coop/issues/392)) ([c6e8f10](https://github.com/source-cooperative/source.coop/commit/c6e8f10701b57bf2d20e4720e1b277ed099d5d3f))
* **data-connections:** require unsigned connections to be read-only ([#394](https://github.com/source-cooperative/source.coop/issues/394)) ([c2af48b](https://github.com/source-cooperative/source.coop/commit/c2af48b4f1c2de78732b434ac7b28a40934b4492))
* delete product feature with confirmation modal ([#361](https://github.com/source-cooperative/source.coop/issues/361)) ([0f68e47](https://github.com/source-cooperative/source.coop/commit/0f68e47e8ddb80043763ff5bc16b9517cd57909f))
* **globe:** render live activity per datacenter ([#395](https://github.com/source-cooperative/source.coop/issues/395)) ([d119935](https://github.com/source-cooperative/source.coop/commit/d119935229f3faa16d601dcf954e2db44b5358b1))
* **globe:** tidy live-activity popup, per-product count on hover ([#397](https://github.com/source-cooperative/source.coop/issues/397)) ([1d92b1f](https://github.com/source-cooperative/source.coop/commit/1d92b1fe2a66af5ec3dc2fe95764fd6440cbec29))
* **object-browser:** delete files and prefixes in edit mode ([#403](https://github.com/source-cooperative/source.coop/issues/403)) ([2b1426b](https://github.com/source-cooperative/source.coop/commit/2b1426b87919c0ba5645bcb4a3b609c422185127))
* OIDC auth ([#283](https://github.com/source-cooperative/source.coop/issues/283)) ([c40ec89](https://github.com/source-cooperative/source.coop/commit/c40ec8976b50c29412f6334ad8df85906bb419bd))
* **products:** choose a data connection and enforce its allowed visibilities ([#338](https://github.com/source-cooperative/source.coop/issues/338)) ([c40818f](https://github.com/source-cooperative/source.coop/commit/c40818fbd7aa40feea63b19ecc44acbfe15681a9))
* **products:** deactivate products — form toggle, admin-only viewing, API 404s others ([#372](https://github.com/source-cooperative/source.coop/issues/372)) ([77dc24b](https://github.com/source-cooperative/source.coop/commit/77dc24bd8d8604e56a1e8257a5043e9c1218e461))
* **products:** mark deactivated products in account product list ([#385](https://github.com/source-cooperative/source.coop/issues/385)) ([b8e6806](https://github.com/source-cooperative/source.coop/commit/b8e68062e0730e47f1fca47b70f1215de85860a0))
* **profile:** link to Ory settings from read-only email field ([#349](https://github.com/source-cooperative/source.coop/issues/349)) ([34a2244](https://github.com/source-cooperative/source.coop/commit/34a224446d39d3606abbe70544d3f51f68c1b2bd))
* **scripts:** bulk-apply web-identity auth to opendata S3 connections ([#398](https://github.com/source-cooperative/source.coop/issues/398)) ([45e4133](https://github.com/source-cooperative/source.coop/commit/45e413346ec838d17d995acf8a5eb0138f798524))
* **scripts:** migrate restricted open-data products to unlisted ([#343](https://github.com/source-cooperative/source.coop/issues/343)) ([#371](https://github.com/source-cooperative/source.coop/issues/371)) ([2977ee4](https://github.com/source-cooperative/source.coop/commit/2977ee49f916d41cc75e40654c06a5986ac7f207))
* **uploads:** route in-browser uploads through the data proxy ([#391](https://github.com/source-cooperative/source.coop/issues/391)) ([92f61ed](https://github.com/source-cooperative/source.coop/commit/92f61ede9c66deb0ed186c1a2b625e94c636875b))
* **viewer:** Add PDF viewer, PNG bindings ([#315](https://github.com/source-cooperative/source.coop/issues/315)) ([7927431](https://github.com/source-cooperative/source.coop/commit/7927431815971f9d6e11b5ab25164835cf151c70))
* **viewer:** support ndjson/jsonl ([3790a24](https://github.com/source-cooperative/source.coop/commit/3790a24c723daa274c0259f8df9507da8058e88c)), closes [#390](https://github.com/source-cooperative/source.coop/issues/390)


### Bug Fixes

* **api:** return 200 on successful member invite ([#381](https://github.com/source-cooperative/source.coop/issues/381)) ([3be8e49](https://github.com/source-cooperative/source.coop/commit/3be8e49b825526d2f13dd987c37113f99d23d450))
* **auth:** log out sessions stuck at AAL1 when whoami requires AAL2 ([#396](https://github.com/source-cooperative/source.coop/issues/396)) ([b9af694](https://github.com/source-cooperative/source.coop/commit/b9af6947f6985008c2c85578de77b54bbae799a1))
* **data-connection:** enforce provider↔auth pairing, tighten ARN + GCP SA validation ([#368](https://github.com/source-cooperative/source.coop/issues/368)) ([4780089](https://github.com/source-cooperative/source.coop/commit/47800897fcd5ffe21646abb00b1c5380438b4602))
* **data-connections:** admin form-reset, redirect, and prefix-template handling ([#379](https://github.com/source-cooperative/source.coop/issues/379)) ([963e7c8](https://github.com/source-cooperative/source.coop/commit/963e7c848cb209ceea93935c0799752357fd33f2))
* **data-connections:** correct trust-policy aud to sts.amazonaws.com ([#382](https://github.com/source-cooperative/source.coop/issues/382)) ([d53b894](https://github.com/source-cooperative/source.coop/commit/d53b8940afb10493f10894ad01e7046b35114798))
* **email-verification:** reconcile Ory verification on every page load ([#347](https://github.com/source-cooperative/source.coop/issues/347)) ([e0a85c3](https://github.com/source-cooperative/source.coop/commit/e0a85c379b20b57481a93d81d8f39dc0fd3122d4))
* **forms:** opt out of React's auto form-reset so controlled fields don't flash ([#373](https://github.com/source-cooperative/source.coop/issues/373)) ([0eb033f](https://github.com/source-cooperative/source.coop/commit/0eb033f6400c5b8699913cc3fa5c888fccc02b2a))
* **globe:** fall back to static image when WebGL is disabled ([#387](https://github.com/source-cooperative/source.coop/issues/387)) ([eb5c9a6](https://github.com/source-cooperative/source.coop/commit/eb5c9a60ee07fe69f60edefb6714bc609815f0b5))
* make full menu item area clickable ([#295](https://github.com/source-cooperative/source.coop/issues/295)) ([e27a3c2](https://github.com/source-cooperative/source.coop/commit/e27a3c23c50b264b0cc0897ce87b785ec8cbefac))
* **product:** hide edit buttons when data connection is read-only ([#353](https://github.com/source-cooperative/source.coop/issues/353)) ([b57cfab](https://github.com/source-cooperative/source.coop/commit/b57cfabcc232eadc0d767d2a9c757dc2848dd983))
* **products:** degrade gracefully when a data-proxy read fails ([#400](https://github.com/source-cooperative/source.coop/issues/400)) ([3b5adb5](https://github.com/source-cooperative/source.coop/commit/3b5adb5f0a464c4935d6cb4f717540348a70b29b))
* re-render auth UI after form-submission redirects ([#344](https://github.com/source-cooperative/source.coop/issues/344)) ([a378ebc](https://github.com/source-cooperative/source.coop/commit/a378ebc1a523eaaed80eca803283056a57e01db4))
* require auth for restricted products ([#284](https://github.com/source-cooperative/source.coop/issues/284)) ([112265a](https://github.com/source-cooperative/source.coop/commit/112265aea73a84a364d0843ff7798124a5f65f14))
* return user to current view after login ([#346](https://github.com/source-cooperative/source.coop/issues/346)) ([9dd6d5f](https://github.com/source-cooperative/source.coop/commit/9dd6d5f923237a2f79517c5f7a917609c964ecb4))
* show same-path re-uploads without a manual refresh ([#409](https://github.com/source-cooperative/source.coop/issues/409)) ([b878b68](https://github.com/source-cooperative/source.coop/commit/b878b68f81134989a58c0fb5f696f3053ed6f682))
* **uploads:** refresh STS credentials mid-upload ([#401](https://github.com/source-cooperative/source.coop/issues/401)) ([#402](https://github.com/source-cooperative/source.coop/issues/402)) ([8da202d](https://github.com/source-cooperative/source.coop/commit/8da202d177535fa1a39ecca5c60a3fe6a4e95497))
* use [source-coop] as INI profile name ([c06a5ac](https://github.com/source-cooperative/source.coop/commit/c06a5ac105b6ecbfa5ad95c222aa8846c0f6251a))
* validate product DOI format ([#319](https://github.com/source-cooperative/source.coop/issues/319)) ([4727dec](https://github.com/source-cooperative/source.coop/commit/4727dec6f267619aef7a8ab8886c88e9b182a24c))


### Performance Improvements

* **db:** request-scoped memoization of DynamoDB reads ([#320](https://github.com/source-cooperative/source.coop/issues/320)) ([1f295cf](https://github.com/source-cooperative/source.coop/commit/1f295cf18e0cf451d3ef328fb23d4316cf15dbec))


### Miscellaneous Chores

* release 1.4.0 ([810ff3c](https://github.com/source-cooperative/source.coop/commit/810ff3c39a7192e33c037c6d945ebe325493d063))

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
