import test from 'ava';
import rgbHexConv from '.';

test('Converts rgb to 6 digits notation hex', t => {
	t.is(rgbHexConv(0,0,0), '000000');
  t.is(rgbHexConv(255,255,255), 'FFFFFF');
  t.is(rgbHexConv(10,54,178), '0A36B2');
  t.is(rgbHexConv(89,71,162), '5947A2');

  // Negative numbers
  t.is(rgbHexConv(89,-71,162), '5947A2');
  t.is(rgbHexConv(-212,145,-67), 'D49143');
});

// 6 digits Negative numbers
test('Converts rgb to 6 digits notation hex using negative numbers', t => {

  t.is(rgbHexConv(89,-71,162), '5947A2');
  t.is(rgbHexConv(-212,145,-67), 'D49143');
});

// 3 digits hex
test('Converts rgb to 3 digits notation hex', t => {
  t.is(rgbHexConv(142,255,1, true), '8F0');
  t.is(rgbHexConv(159,0,55, true), '903');
  t.is(rgbHexConv(72,54,98, true), '436');
  t.is(rgbHexConv(42,14,1, true), '210');
});
