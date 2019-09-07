# rgb-hex-conv

> Convert RGB values of a color to a hexadecimal notation 6-digit or 3-digit string

## Usage

```js
const rgbHexConv = require('rgb-hex-conv');

// 6 digits hexadecimal notation
rgbHexConv(2,3,4);
// returns '020304'
rgbHexConv(255,0,255);
// returns 'FF00FF'
rgbHexConv(200,123,49);
// returns 'C87B31'
rgbHexConv(123,97,1);
// returns '7B6101'

// 3 digits hexadecimal notation
rgbHexConv(2,3,4, true);
// returns '000'
rgbHexConv(255,0,255, true);
// returns 'F0F'
rgbHexConv(200,123,49, true);
// returns 'C73'
rgbHexConv(123,97,1, true);
// returns '760'
```

## License

MIT © Damian Polak
