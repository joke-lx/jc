# Changelog

## [0.4.0](https://github.com/joke-lx/jc/compare/v0.3.2...v0.4.0) (2026-08-02)


### Features

* **mgr:** add --install mode for one-shot install-and-alias workflow ([932d76e](https://github.com/joke-lx/jc/commit/932d76e95abfc3f4f07bced701ea6c69ad72c3ae))
* **mgr:** add standalone 'install' verb for one-shot tool registration ([765dc54](https://github.com/joke-lx/jc/commit/765dc54ee0962d58fbb801955e5ca8fee88ef0b7))

## [0.3.2](https://github.com/joke-lx/jc/compare/v0.3.1...v0.3.2) (2026-08-02)


### Bug Fixes

* **mgr:** quote spaced exec paths before shell spawn ([245aad9](https://github.com/joke-lx/jc/commit/245aad9af278fa039641b88bbc3af4d1fc49742e))

## [0.3.1](https://github.com/joke-lx/jc/compare/v0.3.0...v0.3.1) (2026-08-02)


### Bug Fixes

* **mgr:** don't attach stdin listeners at module load ([8b21e48](https://github.com/joke-lx/jc/commit/8b21e4879f9eed788aab7f35c3268c7581910163))
* **mgr:** preserve spaced Windows paths in handler preflight ([d682384](https://github.com/joke-lx/jc/commit/d68238488ede7b7dfd5c07146b8121297420f6e3))

## [0.3.0](https://github.com/joke-lx/jc/compare/v0.2.0...v0.3.0) (2026-08-02)


### Features

* **mgr:** add backup and restore for portable registry snapshots ([e73aa23](https://github.com/joke-lx/jc/commit/e73aa23b42cb03084495e660af1f8bb66e674b3a))
* **mgr:** interactive prompts when arguments are missing ([bce1e53](https://github.com/joke-lx/jc/commit/bce1e5328f0c2bf2505c838ea1e5fad675f6d72e))


### Bug Fixes

* **router:** support top-level help shortcuts and direct alias invocation ([2611372](https://github.com/joke-lx/jc/commit/2611372e96d3431ae673df205114f7381f818dbc))

## [0.2.0](https://github.com/joke-lx/jc/compare/v0.1.2...v0.2.0) (2026-08-01)


### Features

* **jc:** jc-development skill, jc mgr unified manager, and handler abstraction ([a6ddf31](https://github.com/joke-lx/jc/commit/a6ddf31bd47fcb1c0172a713cf8540f8947e16f2))

## [0.1.2](https://github.com/joke-lx/jc/compare/v0.1.1...v0.1.2) (2026-06-21)


### Bug Fixes

* **ci:** remove tag creation — release-please already owns this ([491ae89](https://github.com/joke-lx/jc/commit/491ae898a01dedc51ce9746dd311fe7bfb1fbca6))

## [0.1.1](https://github.com/joke-lx/jc/compare/v0.1.0...v0.1.1) (2026-06-20)


### Bug Fixes

* add a 'repository' field pointing at the canonical git URL. ([694e40e](https://github.com/joke-lx/jc/commit/694e40e7d141c5e409d121d797e1c5b62642d39a))
* **ci:** grant id-token write permission for npm --provenance ([cc57964](https://github.com/joke-lx/jc/commit/cc57964c39e0aa1cd842d5e8c2bb073875ca3950))
* **ci:** install deps before publish — tsup not found on runner ([a8088ee](https://github.com/joke-lx/jc/commit/a8088eed5095cb51a5af89fc9f247c4232c97db6))
* **ci:** update npm view check to match the actual package name ([c7f82ff](https://github.com/joke-lx/jc/commit/c7f82fffb44a3d3ea141aea2a9e3918b73b7a3c4))
* **package:** add repository field for npm --provenance validation ([694e40e](https://github.com/joke-lx/jc/commit/694e40e7d141c5e409d121d797e1c5b62642d39a))
* **package:** revert name from @joke-lx/jc to je-cd ([6fb05db](https://github.com/joke-lx/jc/commit/6fb05db0add52a4eb41e0159dbb08f2864f7b352))
* point the existence check at the current package name 'je-cd'. ([c7f82ff](https://github.com/joke-lx/jc/commit/c7f82fffb44a3d3ea141aea2a9e3918b73b7a3c4))
