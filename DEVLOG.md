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
