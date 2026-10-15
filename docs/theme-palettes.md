# Theme palettes

Appearance settings separate the existing light/dark choice from the palette. Both preferences are local to the browser or desktop webview. The `theme` storage key keeps its existing values; `theme-palette` stores the selected palette. Missing or invalid palette values fall back to Atelier, preserving the current light and soft dark themes.

The additional palettes are adapted from the six built-in light/dark palette pairs shipped by T3 Code Nightly `0.0.46-nightly.20261015.3145`: T3 Code, T3 Chat, Grove, Ocean, Ember and Iris. The source bundle is `themePalette-HZKhjIvN.js`; the upstream implementation is [themePalette.ts](https://github.com/pingdotgg/t3code/blob/main/apps/web/src/themePalette.ts), with user documentation in [Appearance and themes](https://github.com/pingdotgg/t3code/blob/main/docs/user/appearance.md).

The palettes map T3 Code's canvas, surfaces, text, accent and terminal colors to the application's existing semantic variables. Source OKLCH values are converted to sRGB HSL for the existing Tailwind color contract. Semantic status foregrounds are adapted because the two applications use different foreground/background conventions. Success keeps the application's existing semantic color, since T3 Code does not define an equivalent role. Chart series without a T3 Code equivalent retain their existing cross-palette colors so the series stay distinct. No runtime dependency on T3 Code is required.

The pre-paint bootstrap restores the palette before React starts. Open terminals receive palette changes in place; changing colors does not recreate the terminal or its WebSocket connection.

## Third-party license

The adapted T3 Code palette definitions are distributed under the following notice from the [upstream license](https://github.com/pingdotgg/t3code/blob/main/LICENSE).

MIT License

Copyright (c) 2026 T3 Tools Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
