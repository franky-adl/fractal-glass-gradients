## Artistic Direction

- I found Pinterest references really good.
- https://www.pinterest.com/pin/19069998418503001/
- And this one has a bit more details at the flute edges: https://www.pinterest.com/pin/377317275054403421/

## Aiming for Framer-compatible React component

- This is the first time I try to build something really production ready actually
- I want the scene to be totally responsive, whether on bigger screens or mobile, the scene pattern should still look good
- So I use gl_FragCoord as a base to calculate the pattern, and flute width to be px-based, such that the pattern will look more consistent across different screen sizes

## Making the pattern

- This is going to be hard, as the target pattern is quite sophisticated actually, so I need to do this step by step
- a prominent feature of these pinterest refs is that there are large curves which mark stark color contrasts.
- let's start with something simple:

### Distort a 50-50 gradient

- pick 2 colors and mix them 50-50, then try to distort it using different methods
- let's start with a sine
- AI suggested an organic pattern with 5 gaussian blobs, and with some snoise warp, result is pretty good.
- we could also try simplex noise, I'm thinking of interlaying 2 layers of noise, one rotated slightly like 30-60 degrees, so as to create some long curves like the pinterest ref

### Film Grain effect

- I reused the one I used for the water caustics project, put it on Figma and further increased the contrast for a bolder grain effect.
- I had to adjust the uv for both the film grain and the noise, especially for the film grain, to make it look good on small or ultrawide screens, otherwise the pattern would look squeezed on mobiles or too stretched on ultrawide screens

### Todo

- [x] Add a good film grain layer, cheap stuff like a simple random function doesn't look good enough
- [x] Add options for different palettes
- [x] Add option to tune down the brightness of the pattern to cater for more use cases
- [x] Add options for different noise/distortion patterns
- [x] Consider making it look better on mobile, right now the color pattern looks a bit squeezed on mobile
