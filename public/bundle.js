
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
(function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value) {
        node.style.setProperty(key, value);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_binding_callback(fn) {
        binding_callbacks.push(fn);
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.shift()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            while (render_callbacks.length) {
                const callback = render_callbacks.pop();
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_render);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_render.forEach(add_render_callback);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_render } = component.$$;
        fragment.m(target, anchor);
        // onMount happens after the initial afterUpdate. Because
        // afterUpdate callbacks happen in reverse order (inner first)
        // we schedule onMount callbacks before afterUpdate callbacks
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_render.forEach(add_render_callback);
    }
    function destroy(component, detaching) {
        if (component.$$) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal: not_equal$$1,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_render: [],
            after_render: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_render);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro && component.$$.fragment.i)
                component.$$.fragment.i();
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy(this, true);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const rgb2hex = ({r, g, b}) => {
      let rhex = r.toString(16);
      let ghex = g.toString(16);
      let bhex = b.toString(16);
      if(rhex.length === 1) rhex = "0" + rhex;
      if(ghex.length === 1) ghex = "0" + ghex;
      if(bhex.length === 1) bhex = "0" + bhex;
      return `#${rhex}${ghex}${bhex}`;
    };

    /* src/Base.svelte generated by Svelte v3.5.1 */

    const file = "src/Base.svelte";

    // (652:2) {#if alpha}
    function create_if_block_1(ctx) {
    	var div3, div0, t0, div1, t1, div2, dispose;

    	return {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			div0.className = "alpha-value svelte-l1lxxq";
    			add_location(div0, file, 653, 6, 16002);
    			div1.className = "alpha-picker svelte-l1lxxq";
    			add_location(div1, file, 654, 6, 16040);
    			div2.className = "alpha-event svelte-l1lxxq";
    			add_location(div2, file, 655, 6, 16103);
    			div3.className = "alpha-selector svelte-l1lxxq";
    			add_location(div3, file, 652, 4, 15967);

    			dispose = [
    				listen(div2, "mousedown", ctx.alphaDown),
    				listen(div2, "touchstart", ctx.alphaDownTouch)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div0);
    			append(div3, t0);
    			append(div3, div1);
    			add_binding_callback(() => ctx.div1_binding_1(div1, null));
    			append(div3, t1);
    			append(div3, div2);
    			add_binding_callback(() => ctx.div2_binding(div2, null));
    		},

    		p: function update(changed, ctx) {
    			if (changed.items) {
    				ctx.div1_binding_1(null, div1);
    				ctx.div1_binding_1(div1, null);
    			}
    			if (changed.items) {
    				ctx.div2_binding(null, div2);
    				ctx.div2_binding(div2, null);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div3);
    			}

    			ctx.div1_binding_1(null, div1);
    			ctx.div2_binding(null, div2);
    			run_all(dispose);
    		}
    	};
    }

    // (706:6) {#if alpha}
    function create_if_block(ctx) {
    	var div1, input, t, div0, dispose;

    	return {
    		c: function create() {
    			div1 = element("div");
    			input = element("input");
    			t = space();
    			div0 = element("div");
    			div0.textContent = "A";
    			attr(input, "type", "text");
    			input.className = "text text-rgba svelte-l1lxxq";
    			input.value = ctx.fixedAlpha;
    			add_location(input, file, 707, 10, 17489);
    			div0.className = "text-label svelte-l1lxxq";
    			add_location(div0, file, 714, 10, 17687);
    			div1.className = "rgb-text-block svelte-l1lxxq";
    			add_location(div1, file, 706, 8, 17450);

    			dispose = [
    				listen(input, "input", ctx.handleInputA),
    				listen(input, "keypress", ctx.handleKeypressA)
    			];
    		},

    		m: function mount(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, input);
    			append(div1, t);
    			append(div1, div0);
    		},

    		p: function update(changed, ctx) {
    			if (changed.fixedAlpha) {
    				input.value = ctx.fixedAlpha;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div1);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function create_fragment(ctx) {
    	var div19, div4, div3, div2, div0, t0, div1, t1, div7, div5, t2, div6, t3, t4, div18, div9, div8, t5, div10, input0, t6, div17, div12, input1, t7, div11, t9, div14, input2, t10, div13, t12, div16, input3, t13, div15, t15, div19_class_value, dispose;

    	var if_block0 = (ctx.alpha) && create_if_block_1(ctx);

    	var if_block1 = (ctx.alpha) && create_if_block(ctx);

    	return {
    		c: function create() {
    			div19 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div7 = element("div");
    			div5 = element("div");
    			t2 = space();
    			div6 = element("div");
    			t3 = space();
    			if (if_block0) if_block0.c();
    			t4 = space();
    			div18 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			t5 = space();
    			div10 = element("div");
    			input0 = element("input");
    			t6 = space();
    			div17 = element("div");
    			div12 = element("div");
    			input1 = element("input");
    			t7 = space();
    			div11 = element("div");
    			div11.textContent = "R";
    			t9 = space();
    			div14 = element("div");
    			input2 = element("input");
    			t10 = space();
    			div13 = element("div");
    			div13.textContent = "G";
    			t12 = space();
    			div16 = element("div");
    			input3 = element("input");
    			t13 = space();
    			div15 = element("div");
    			div15.textContent = "B";
    			t15 = space();
    			if (if_block1) if_block1.c();
    			div0.className = "colorsquare-picker svelte-l1lxxq";
    			add_location(div0, file, 640, 14, 15502);
    			div1.className = "colorsquare-event svelte-l1lxxq";
    			add_location(div1, file, 641, 14, 15585);
    			div2.className = "value-gradient svelte-l1lxxq";
    			add_location(div2, file, 639, 10, 15459);
    			div3.className = "saturation-gradient svelte-l1lxxq";
    			add_location(div3, file, 638, 6, 15415);
    			div4.className = "colorsquare size svelte-l1lxxq";
    			add_location(div4, file, 637, 2, 15354);
    			div5.className = "hue-picker svelte-l1lxxq";
    			add_location(div5, file, 647, 6, 15777);
    			div6.className = "hue-event svelte-l1lxxq";
    			add_location(div6, file, 648, 6, 15836);
    			div7.className = "hue-selector svelte-l1lxxq";
    			add_location(div7, file, 646, 2, 15744);
    			div8.className = "color-picked svelte-l1lxxq";
    			set_style(div8, "background-color", "rgba(" + ctx.r + "," + ctx.g + "," + ctx.b + "," + ctx.a + ")");
    			add_location(div8, file, 661, 6, 16305);
    			div9.className = "color-picked-bg svelte-l1lxxq";
    			add_location(div9, file, 660, 4, 16269);
    			input0.className = "text text-hex svelte-l1lxxq";
    			input0.value = ctx.hexValue;
    			add_location(input0, file, 665, 6, 16437);
    			div10.className = "hex-text-block svelte-l1lxxq";
    			add_location(div10, file, 664, 4, 16402);
    			attr(input1, "type", "text");
    			input1.className = "text text-rgba svelte-l1lxxq";
    			input1.value = ctx.r;
    			input1.maxLength = 3;
    			add_location(input1, file, 670, 8, 16597);
    			div11.className = "text-label svelte-l1lxxq";
    			add_location(div11, file, 678, 8, 16798);
    			div12.className = "rgb-text-block svelte-l1lxxq";
    			add_location(div12, file, 669, 6, 16560);
    			attr(input2, "type", "text");
    			input2.className = "text text-rgba svelte-l1lxxq";
    			input2.value = ctx.g;
    			input2.maxLength = 3;
    			add_location(input2, file, 682, 8, 16887);
    			div13.className = "text-label svelte-l1lxxq";
    			add_location(div13, file, 690, 8, 17088);
    			div14.className = "rgb-text-block svelte-l1lxxq";
    			add_location(div14, file, 681, 6, 16850);
    			attr(input3, "type", "text");
    			input3.className = "text text-rgba svelte-l1lxxq";
    			input3.value = ctx.b;
    			input3.maxLength = 3;
    			add_location(input3, file, 694, 8, 17177);
    			div15.className = "text-label svelte-l1lxxq";
    			add_location(div15, file, 702, 8, 17378);
    			div16.className = "rgb-text-block svelte-l1lxxq";
    			add_location(div16, file, 693, 6, 17140);
    			div17.className = "rgb-text-div svelte-l1lxxq";
    			add_location(div17, file, 668, 4, 16527);
    			div18.className = "color-info-box svelte-l1lxxq";
    			add_location(div18, file, 659, 2, 16236);
    			div19.className = div19_class_value = "main-container " + ctx.className + " svelte-l1lxxq";
    			add_location(div19, file, 635, 0, 15310);

    			dispose = [
    				listen(div1, "mousedown", ctx.csDown),
    				listen(div1, "touchstart", ctx.csDownTouch),
    				listen(div6, "mousedown", ctx.hueDown),
    				listen(div6, "touchstart", ctx.hueDownTouch),
    				listen(input0, "input", ctx.handleInputHex),
    				listen(input1, "input", ctx.handleInputR),
    				listen(input1, "keypress", ctx.handleKeypressRGB),
    				listen(input2, "input", ctx.handleInputG),
    				listen(input2, "keypress", ctx.handleKeypressRGB),
    				listen(input3, "input", ctx.handleInputB),
    				listen(input3, "keypress", ctx.handleKeypressRGB)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, div19, anchor);
    			append(div19, div4);
    			append(div4, div3);
    			append(div3, div2);
    			append(div2, div0);
    			add_binding_callback(() => ctx.div0_binding(div0, null));
    			append(div2, t0);
    			append(div2, div1);
    			add_binding_callback(() => ctx.div1_binding(div1, null));
    			add_binding_callback(() => ctx.div4_binding(div4, null));
    			append(div19, t1);
    			append(div19, div7);
    			append(div7, div5);
    			add_binding_callback(() => ctx.div5_binding(div5, null));
    			append(div7, t2);
    			append(div7, div6);
    			add_binding_callback(() => ctx.div6_binding(div6, null));
    			append(div19, t3);
    			if (if_block0) if_block0.m(div19, null);
    			append(div19, t4);
    			append(div19, div18);
    			append(div18, div9);
    			append(div9, div8);
    			append(div18, t5);
    			append(div18, div10);
    			append(div10, input0);
    			append(div18, t6);
    			append(div18, div17);
    			append(div17, div12);
    			append(div12, input1);
    			append(div12, t7);
    			append(div12, div11);
    			append(div17, t9);
    			append(div17, div14);
    			append(div14, input2);
    			append(div14, t10);
    			append(div14, div13);
    			append(div17, t12);
    			append(div17, div16);
    			append(div16, input3);
    			append(div16, t13);
    			append(div16, div15);
    			append(div17, t15);
    			if (if_block1) if_block1.m(div17, null);
    		},

    		p: function update(changed, ctx) {
    			if (changed.items) {
    				ctx.div0_binding(null, div0);
    				ctx.div0_binding(div0, null);
    			}
    			if (changed.items) {
    				ctx.div1_binding(null, div1);
    				ctx.div1_binding(div1, null);
    			}
    			if (changed.items) {
    				ctx.div4_binding(null, div4);
    				ctx.div4_binding(div4, null);
    			}
    			if (changed.items) {
    				ctx.div5_binding(null, div5);
    				ctx.div5_binding(div5, null);
    			}
    			if (changed.items) {
    				ctx.div6_binding(null, div6);
    				ctx.div6_binding(div6, null);
    			}

    			if (ctx.alpha) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div19, t4);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (changed.r || changed.g || changed.b || changed.a) {
    				set_style(div8, "background-color", "rgba(" + ctx.r + "," + ctx.g + "," + ctx.b + "," + ctx.a + ")");
    			}

    			if (changed.hexValue) {
    				input0.value = ctx.hexValue;
    			}

    			if (changed.r) {
    				input1.value = ctx.r;
    			}

    			if (changed.g) {
    				input2.value = ctx.g;
    			}

    			if (changed.b) {
    				input3.value = ctx.b;
    			}

    			if (ctx.alpha) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(div17, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if ((changed.className) && div19_class_value !== (div19_class_value = "main-container " + ctx.className + " svelte-l1lxxq")) {
    				div19.className = div19_class_value;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(div19);
    			}

    			ctx.div0_binding(null, div0);
    			ctx.div1_binding(null, div1);
    			ctx.div4_binding(null, div4);
    			ctx.div5_binding(null, div5);
    			ctx.div6_binding(null, div6);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			run_all(dispose);
    		}
    	};
    }

    const nums = "0123456789";

    function hsvToRgb(h, s, v) {
     var r, g, b;

     var i = Math.floor(h * 6);
     var f = h * 6 - i;
     var p = v * (1 - s);
     var q = v * (1 - f * s);
     var t = v * (1 - (1 - f) * s);

     switch (i % 6) {
    case 0:
     r = v, g = t, b = p;
     break;
    case 1:
     r = q, g = v, b = p;
     break;
    case 2:
     r = p, g = v, b = t;
     break;
    case 3:
     r = p, g = q, b = v;
     break;
    case 4:
     r = t, g = p, b = v;
     break;
    case 5:
     r = v, g = p, b = q;
     break;
     }

     return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    function instance($$self, $$props, $$invalidate) {
    	

    let { class: className = "", alpha = true, startColor = "#ff0000" } = $$props;

    onMount(() => {
      document.addEventListener("mouseup", mouseUp);
      document.addEventListener("touchend", mouseUp);
      document.addEventListener("mousemove", mouseMove);
      document.addEventListener("touchmove", touchMove);
      document.addEventListener("touchstart", killMouseEvents);
      document.addEventListener("mousedown", killTouchEvents);
      setStartColor();
    });

    const setColor = (color) => {
      if(typeof color !== "string"){
        color = rgb2hex(color);
      }
       
      $$invalidate('startColor', startColor = color);
      setStartColor();
    };

    // DOM
    let colorSquarePicker;
    let colorSquareEvent;
    let alphaPicker;
    let alphaEvent;
    let huePicker;
    let hueEvent;let colorSquare;

    const dispatch = createEventDispatcher();
    let tracked;
    let h = 1;
    let s = 1;
    let v = 1;
    let a = 1;
    let r = 255;
    let g = 0;
    let b = 0;
    let hexValue = '#ff0000';


    function setStartColor() {
      let hex = startColor.replace('#','');
      if (hex.length !== 6 && hex.length !== 3 && !hex.match(/([^A-F0-9])/gi)) {
        throw new Error(`Invalid property value startColor ${startColor}`);
        return;
      }
      let hexFiltered='';
      if (hex.length === 3)
        hex.split('').forEach( c => {hexFiltered += c+c;});
      else
        hexFiltered=hex;
      $$invalidate('hexValue', hexValue = hexFiltered);
      $$invalidate('r', r = parseInt(hexFiltered.substring(0,2), 16));
      $$invalidate('g', g = parseInt(hexFiltered.substring(2,4), 16));
      $$invalidate('b', b = parseInt(hexFiltered.substring(4,6), 16));
      rgbToHSV(r,g,b,true);
      updateCsPicker();
      updateHuePicker();
    }

    function killMouseEvents() {
      alphaEvent.removeEventListener("mousedown",alphaDown);
      colorSquareEvent.removeEventListener("mousedown",csDown);
      hueEvent.removeEventListener("mousedown",hueDown);
      document.removeEventListener("mouseup",mouseUp);
      document.removeEventListener("mousemove",mouseMove);
      document.removeEventListener("touchstart",killMouseEvents);
      document.removeEventListener("mousedown",killTouchEvents);
    }

    function killTouchEvents() {
      alphaEvent.removeEventListener("touchstart",alphaDownTouch);
      colorSquareEvent.removeEventListener("touchstart",csDownTouch);
      hueEvent.removeEventListener("touchstart",hueDownTouch);
      document.removeEventListener("touchend",mouseUp);
      document.removeEventListener("touchmove",touchMove);
      document.removeEventListener("touchstart",killMouseEvents);
      document.removeEventListener("mousedown",killTouchEvents);
    }

    function updateCsPicker() {
      let xPercentage = s * 100;
      let yPercentage = (1 - v) * 100;
      colorSquarePicker.style.top = yPercentage + "%"; $$invalidate('colorSquarePicker', colorSquarePicker);
      colorSquarePicker.style.left = xPercentage + "%"; $$invalidate('colorSquarePicker', colorSquarePicker);
    }

    function updateHuePicker() {
      let xPercentage = h * 100;
      huePicker.style.left = xPercentage + "%"; $$invalidate('huePicker', huePicker);
    }

    function colorChangeCallback() {
      dispatch('colorChange', {
      			r: r,
            g: g,
            b: b,
            a: a
      		});
    }

    function mouseMove(event) {
     if (tracked) {
      let mouseX = event.clientX;
      let mouseY = event.clientY;
      let trackedPos = tracked.getBoundingClientRect();
      let xPercentage, yPercentage;
      switch (tracked) {
       case colorSquareEvent:
        xPercentage = (mouseX - trackedPos.x) / 240 * 100;
        yPercentage = (mouseY - trackedPos.y) / 160 * 100;
        (xPercentage > 100) ? xPercentage = 100: (xPercentage < 0) ? xPercentage = 0 : null;
        (yPercentage > 100) ? yPercentage = 100: (yPercentage < 0) ? yPercentage = 0 : null;
        yPercentage = yPercentage.toFixed(2);
        xPercentage = xPercentage.toFixed(2);
        colorSquarePicker.style.top = yPercentage + "%"; $$invalidate('colorSquarePicker', colorSquarePicker);
        colorSquarePicker.style.left = xPercentage + "%"; $$invalidate('colorSquarePicker', colorSquarePicker);
        s = xPercentage / 100;
        v = 1 - yPercentage / 100;
        colorChange();
        break;
       case hueEvent:
        xPercentage = (mouseX - 10 - trackedPos.x) / 220 * 100;
        (xPercentage > 100) ? xPercentage = 100: (xPercentage < 0) ? xPercentage = 0 : null;
        xPercentage = xPercentage.toFixed(2);
        huePicker.style.left = xPercentage + "%"; $$invalidate('huePicker', huePicker);
        h = xPercentage / 100;
        hueChange();
        break;
       case alphaEvent:
        xPercentage = (mouseX - 10 - trackedPos.x) / 220 * 100;
        (xPercentage > 100) ? xPercentage = 100: (xPercentage < 0) ? xPercentage = 0 : null;
        xPercentage = xPercentage.toFixed(2);
        alphaPicker.style.left = xPercentage + "%"; $$invalidate('alphaPicker', alphaPicker);
        $$invalidate('a', a = xPercentage / 100);
        colorChange();
        break;
      }

     }

    }

    function touchMove(event) {
     if (tracked) {
      let mouseX = event.touches[0].clientX;
      let mouseY = event.touches[0].clientY;
      let trackedPos = tracked.getBoundingClientRect();
      let xPercentage, yPercentage;
      switch (tracked) {
       case colorSquareEvent:
        xPercentage = (mouseX - trackedPos.x) / 240 * 100;
        yPercentage = (mouseY - trackedPos.y) / 160 * 100;
        (xPercentage > 100) ? xPercentage = 100: (xPercentage < 0) ? xPercentage = 0 : null;
        (yPercentage > 100) ? yPercentage = 100: (yPercentage < 0) ? yPercentage = 0 : null;
        yPercentage = yPercentage.toFixed(2);
        xPercentage = xPercentage.toFixed(2);
        colorSquarePicker.style.top = yPercentage + "%"; $$invalidate('colorSquarePicker', colorSquarePicker);
        colorSquarePicker.style.left = xPercentage + "%"; $$invalidate('colorSquarePicker', colorSquarePicker);
        s = xPercentage / 100;
        v = 1 - yPercentage / 100;
        colorChange();
        break;
       case hueEvent:
        xPercentage = (mouseX - 10 - trackedPos.x) / 220 * 100;
        (xPercentage > 100) ? xPercentage = 100: (xPercentage < 0) ? xPercentage = 0 : null;
        xPercentage = xPercentage.toFixed(2);
        huePicker.style.left = xPercentage + "%"; $$invalidate('huePicker', huePicker);
        h = xPercentage / 100;
        hueChange();
        break;
       case alphaEvent:
        xPercentage = (mouseX - 10 - trackedPos.x) / 220 * 100;
        (xPercentage > 100) ? xPercentage = 100: (xPercentage < 0) ? xPercentage = 0 : null;
        xPercentage = xPercentage.toFixed(2);
        alphaPicker.style.left = xPercentage + "%"; $$invalidate('alphaPicker', alphaPicker);
        $$invalidate('a', a = xPercentage / 100);
        colorChange();
        break;
      }

     }

    }

    function csDown(event) {
     tracked = event.currentTarget;
     let xPercentage = ((event.offsetX + 1) / 240) * 100;
     let yPercentage = ((event.offsetY + 1) / 160) * 100;
     yPercentage = yPercentage.toFixed(2);
     xPercentage = xPercentage.toFixed(2);
     colorSquarePicker.style.top = yPercentage + "%"; $$invalidate('colorSquarePicker', colorSquarePicker);
     colorSquarePicker.style.left = xPercentage + "%"; $$invalidate('colorSquarePicker', colorSquarePicker);
     s = xPercentage / 100;
     v = 1 - yPercentage / 100;
     colorChange();
    }

    function csDownTouch(event) {
     tracked = event.currentTarget;
     let rect = event.target.getBoundingClientRect();
     let offsetX = event.targetTouches[0].clientX - rect.left;
     let offsetY = event.targetTouches[0].clientY - rect.top;
     let xPercentage = ((offsetX + 1) / 240) * 100;
     let yPercentage = ((offsetY + 1) / 160) * 100;
     yPercentage = yPercentage.toFixed(2);
     xPercentage = xPercentage.toFixed(2);
     colorSquarePicker.style.top = yPercentage + "%"; $$invalidate('colorSquarePicker', colorSquarePicker);
     colorSquarePicker.style.left = xPercentage + "%"; $$invalidate('colorSquarePicker', colorSquarePicker);
     s = xPercentage / 100;
     v = 1 - yPercentage / 100;
     colorChange();
    }

    function mouseUp(event) {
     tracked = null;
    }

    function hueDown(event) {
     tracked = event.currentTarget;
     let xPercentage = ((event.offsetX - 9) / 220) * 100;
     xPercentage = xPercentage.toFixed(2);
     huePicker.style.left = xPercentage + "%"; $$invalidate('huePicker', huePicker);
     h = xPercentage / 100;
     hueChange();
    }

    function hueDownTouch(event) {
     tracked = event.currentTarget;
     let rect = event.target.getBoundingClientRect();
     let offsetX = event.targetTouches[0].clientX - rect.left;
     let xPercentage = ((offsetX - 9) / 220) * 100;
     xPercentage = xPercentage.toFixed(2);
     huePicker.style.left = xPercentage + "%"; $$invalidate('huePicker', huePicker);
     h = xPercentage / 100;
     hueChange();
    }

    function hueChange() {
     let rgb = hsvToRgb(h, 1, 1);
     colorSquare.style.background = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`; $$invalidate('colorSquare', colorSquare);
     colorChange();
    }

    function colorChange() {
     let rgb = hsvToRgb(h, s, v);
     $$invalidate('r', r = rgb[0]);
     $$invalidate('g', g = rgb[1]);
     $$invalidate('b', b = rgb[2]);
     $$invalidate('hexValue', hexValue = RGBAToHex());
     colorChangeCallback();
    }

    function alphaDown(event) {
     tracked = event.currentTarget;
     let xPercentage = ((event.offsetX - 9) / 220) * 100;
     xPercentage = xPercentage.toFixed(2);
     alphaPicker.style.left = xPercentage + "%"; $$invalidate('alphaPicker', alphaPicker);
     $$invalidate('a', a = xPercentage / 100);
     colorChange();
    }

    function alphaDownTouch(event) {
     tracked = event.currentTarget;
     let rect = event.target.getBoundingClientRect();
     let offsetX = event.targetTouches[0].clientX - rect.left;
     let xPercentage = ((offsetX - 9) / 220) * 100;
     xPercentage = xPercentage.toFixed(2);
     let picker = document.querySelector("#alpha-picker");
     picker.style.left = xPercentage + "%";
     $$invalidate('a', a = xPercentage / 100);
     colorChange();
    }

    function RGBAToHex() {
     let rHex = r.toString(16);
     let gHex = g.toString(16);
     let bHex = b.toString(16);

     if (rHex.length == 1)
      rHex = "0" + rHex;
     if (gHex.length == 1)
      gHex = "0" + gHex;
     if (bHex.length == 1)
      bHex = "0" + bHex;


     return ("#" + rHex + gHex + bHex).toUpperCase();
    }

    function rgbToHSV(r, g, b, update) {
        let rperc, gperc, bperc,max,min,diff,pr,hnew,snew,vnew;
        rperc = r / 255;
        gperc = g / 255;
        bperc = b / 255;
        max = Math.max(rperc, gperc, bperc);
        min = Math.min(rperc, gperc, bperc);
        diff = max - min;

        vnew = max;
        (vnew == 0) ? snew = 0 : snew = diff / max ;

        for (let i=0;i<3;i++) {
          if ([rperc,gperc,bperc][i] === max) {
            pr=i;
            break;
          }
        }
        if (diff==0) {
          hnew = 0;
          if (update) {
            h=hnew;
            s=snew;
            v=vnew;
            hueChange();
            return;
          }
          else {
            return {h:hnew,s:snew,v:vnew};
          }
        }
        else {
          switch (pr) {
            case 0:
              hnew=60*(((gperc-bperc)/diff)%6)/360;
              break;
            case 1:
              hnew=60*(((bperc-rperc)/diff)+2)/360;
              break;
            case 2:
              hnew=60*(((rperc-gperc)/diff)+4)/360;
              break;
          }
          if (hnew < 0) hnew+=6;
        }

        if (update) {
          h=hnew;
          s=snew;
          v=vnew;
          hueChange();
        }
        else {
          return {h:hnew,s:snew,v:vnew};
        }
    }

    const handleInputHex = (event) => {
      setColor(event.target.value);
      dispatch('colorchange', {r,g,b,a});
    };

    const fixRGB = (value) => Math.min(255, Math.max(0, value | 0));

    const handleInputR = (event) => {
      $$invalidate('r', r = fixRGB(event.target.value));
      const rgba = {r,g,b,a};
      setColor(rgba);
      dispatch("colorChange", rgba);
    };

    const handleInputG = (event) => {
      $$invalidate('g', g = fixRGB(event.target.value));
      const rgba = {r,g,b,a};
      setColor(rgba);
      dispatch("colorChange", rgba);
    };


    const handleInputB = (event) => {
      $$invalidate('b', b = fixRGB(event.target.value));
      const rgba = {r,g,b,a};
      setColor(rgba);
      dispatch("colorChange", rgba);
    };

    const handleInputA = (event) => {
      $$invalidate('a', a = Math.min(0, Math.max(1, parseFloat(event.target.value) | 0)));
      const rgba = {r,g,b,a};
      setColor(rgba);
      dispatch("colorChange", rgba);
    };
    const handleKeypressRGB = (event) => {
      if(nums.indexOf(event.key) === -1)
        event.preventDefault();
    };

    const handleKeypressA = (event) => {
      if(nums.concat(".").indexOf(event.key) === -1)
        event.preventDefault();
    };

    	const writable_props = ['class', 'alpha', 'startColor'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Base> was created with unknown prop '${key}'`);
    	});

    	function div0_binding($$node, check) {
    		colorSquarePicker = $$node;
    		$$invalidate('colorSquarePicker', colorSquarePicker);
    	}

    	function div1_binding($$node, check) {
    		colorSquareEvent = $$node;
    		$$invalidate('colorSquareEvent', colorSquareEvent);
    	}

    	function div4_binding($$node, check) {
    		colorSquare = $$node;
    		$$invalidate('colorSquare', colorSquare);
    	}

    	function div5_binding($$node, check) {
    		huePicker = $$node;
    		$$invalidate('huePicker', huePicker);
    	}

    	function div6_binding($$node, check) {
    		hueEvent = $$node;
    		$$invalidate('hueEvent', hueEvent);
    	}

    	function div1_binding_1($$node, check) {
    		alphaPicker = $$node;
    		$$invalidate('alphaPicker', alphaPicker);
    	}

    	function div2_binding($$node, check) {
    		alphaEvent = $$node;
    		$$invalidate('alphaEvent', alphaEvent);
    	}

    	$$self.$set = $$props => {
    		if ('class' in $$props) $$invalidate('className', className = $$props.class);
    		if ('alpha' in $$props) $$invalidate('alpha', alpha = $$props.alpha);
    		if ('startColor' in $$props) $$invalidate('startColor', startColor = $$props.startColor);
    	};

    	let fixedAlpha;

    	$$self.$$.update = ($$dirty = { a: 1 }) => {
    		if ($$dirty.a) { $$invalidate('fixedAlpha', fixedAlpha = Math.round(a * 100) / 100); }
    	};

    	return {
    		className,
    		alpha,
    		startColor,
    		setColor,
    		colorSquarePicker,
    		colorSquareEvent,
    		alphaPicker,
    		alphaEvent,
    		huePicker,
    		hueEvent,
    		colorSquare,
    		a,
    		r,
    		g,
    		b,
    		hexValue,
    		csDown,
    		csDownTouch,
    		hueDown,
    		hueDownTouch,
    		alphaDown,
    		alphaDownTouch,
    		handleInputHex,
    		handleInputR,
    		handleInputG,
    		handleInputB,
    		handleInputA,
    		handleKeypressRGB,
    		handleKeypressA,
    		fixedAlpha,
    		div0_binding,
    		div1_binding,
    		div4_binding,
    		div5_binding,
    		div6_binding,
    		div1_binding_1,
    		div2_binding
    	};
    }

    class Base extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["class", "alpha", "startColor", "setColor"]);
    	}

    	get class() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get alpha() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set alpha(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get startColor() {
    		throw new Error("<Base>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set startColor(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setColor() {
    		return this.$$.ctx.setColor;
    	}

    	set setColor(value) {
    		throw new Error("<Base>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Picker.svelte generated by Svelte v3.5.1 */

    function create_fragment$1(ctx) {
    	var current;

    	let base_1_props = {
    		className: ctx.className,
    		startColor: ctx.startColor
    	};
    	var base_1 = new Base({ props: base_1_props, $$inline: true });

    	add_binding_callback(() => ctx.base_1_binding(base_1));
    	base_1.$on("colorChange", ctx.handleChange);

    	return {
    		c: function create() {
    			base_1.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(base_1, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var base_1_changes = {};
    			if (changed.className) base_1_changes.className = ctx.className;
    			if (changed.startColor) base_1_changes.startColor = ctx.startColor;
    			base_1.$set(base_1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			base_1.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			base_1.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			ctx.base_1_binding(null);

    			base_1.$destroy(detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();

    let base;

    let { startColor, class: className = "" } = $$props;
    const setColor = (color) => base && base.setColor(color);

    let isFirstChange = true;
    const handleChange = ({detail}) => {
      if(isFirstChange){
        isFirstChange = false;
        return;
      }
      const color = {...detail, hex: rgb2hex(detail)};
      dispatch("colorChange", color);
    };

    	const writable_props = ['startColor', 'class'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Picker> was created with unknown prop '${key}'`);
    	});

    	function base_1_binding($$component) {
    		base = $$component;
    		$$invalidate('base', base);
    	}

    	$$self.$set = $$props => {
    		if ('startColor' in $$props) $$invalidate('startColor', startColor = $$props.startColor);
    		if ('class' in $$props) $$invalidate('className', className = $$props.class);
    	};

    	return {
    		base,
    		startColor,
    		className,
    		setColor,
    		handleChange,
    		base_1_binding
    	};
    }

    class Picker extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["startColor", "class", "setColor"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.startColor === undefined && !('startColor' in props)) {
    			console.warn("<Picker> was created without expected prop 'startColor'");
    		}
    	}

    	get startColor() {
    		throw new Error("<Picker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set startColor(value) {
    		throw new Error("<Picker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<Picker>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Picker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setColor() {
    		return this.$$.ctx.setColor;
    	}

    	set setColor(value) {
    		throw new Error("<Picker>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Test.svelte generated by Svelte v3.5.1 */

    const file$1 = "src/Test.svelte";

    function create_fragment$2(ctx) {
    	var main, h1, t1, p, code, t3, div2, div0, t4, div1, t5, div5, div3, t6, div4, current;

    	let picker0_props = { startColor: ctx.color1 };
    	var picker0 = new Picker({ props: picker0_props, $$inline: true });

    	add_binding_callback(() => ctx.picker0_binding(picker0));
    	picker0.$on("colorChange", ctx.colorChange_handler);

    	let picker1_props = { startColor: ctx.color2 };
    	var picker1 = new Picker({ props: picker1_props, $$inline: true });

    	add_binding_callback(() => ctx.picker1_binding(picker1));
    	picker1.$on("colorChange", ctx.colorChange_handler_1);

    	return {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Svelte Picker";
    			t1 = space();
    			p = element("p");
    			code = element("code");
    			code.textContent = "npm i svelte-picker";
    			t3 = space();
    			div2 = element("div");
    			div0 = element("div");
    			picker0.$$.fragment.c();
    			t4 = space();
    			div1 = element("div");
    			t5 = space();
    			div5 = element("div");
    			div3 = element("div");
    			picker1.$$.fragment.c();
    			t6 = space();
    			div4 = element("div");
    			h1.className = "svelte-17pa6k1";
    			add_location(h1, file$1, 62, 2, 922);
    			add_location(code, file$1, 63, 5, 950);
    			p.className = "svelte-17pa6k1";
    			add_location(p, file$1, 63, 2, 947);
    			div0.className = "wrap svelte-17pa6k1";
    			add_location(div0, file$1, 66, 4, 1012);
    			div1.className = "color svelte-17pa6k1";
    			set_style(div1, "background-color", ctx.color1);
    			add_location(div1, file$1, 73, 4, 1176);
    			div2.className = "row svelte-17pa6k1";
    			add_location(div2, file$1, 65, 2, 990);
    			div3.className = "wrap svelte-17pa6k1";
    			add_location(div3, file$1, 77, 4, 1265);
    			div4.className = "color svelte-17pa6k1";
    			set_style(div4, "background-color", ctx.color2);
    			add_location(div4, file$1, 87, 4, 1482);
    			div5.className = "row svelte-17pa6k1";
    			add_location(div5, file$1, 76, 2, 1243);
    			main.className = "svelte-17pa6k1";
    			add_location(main, file$1, 60, 0, 912);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, main, anchor);
    			append(main, h1);
    			append(main, t1);
    			append(main, p);
    			append(p, code);
    			append(main, t3);
    			append(main, div2);
    			append(div2, div0);
    			mount_component(picker0, div0, null);
    			append(div2, t4);
    			append(div2, div1);
    			append(main, t5);
    			append(main, div5);
    			append(div5, div3);
    			mount_component(picker1, div3, null);
    			append(div5, t6);
    			append(div5, div4);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var picker0_changes = {};
    			if (changed.color1) picker0_changes.startColor = ctx.color1;
    			picker0.$set(picker0_changes);

    			if (!current || changed.color1) {
    				set_style(div1, "background-color", ctx.color1);
    			}

    			var picker1_changes = {};
    			if (changed.color2) picker1_changes.startColor = ctx.color2;
    			picker1.$set(picker1_changes);

    			if (!current || changed.color2) {
    				set_style(div4, "background-color", ctx.color2);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			picker0.$$.fragment.i(local);

    			picker1.$$.fragment.i(local);

    			current = true;
    		},

    		o: function outro(local) {
    			picker0.$$.fragment.o(local);
    			picker1.$$.fragment.o(local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(main);
    			}

    			ctx.picker0_binding(null);

    			picker0.$destroy();

    			ctx.picker1_binding(null);

    			picker1.$destroy();
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	

    let p1, p2;
    // For use from devTools
    onMount(() => {
      console.log("You can use picker1 and picker2 from the console");
      console.log("Try picker1.setColor('#00ffff')");
      window.picker1 = p1;
      window.picker2 = p2;
    });

    let { color1 = "#ff0000", color2 = "#00ffff" } = $$props;

    	const writable_props = ['color1', 'color2'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Test> was created with unknown prop '${key}'`);
    	});

    	function picker0_binding($$component) {
    		p1 = $$component;
    		$$invalidate('p1', p1);
    	}

    	function colorChange_handler(e) {
    		const $$result = color1 = e.detail.hex;
    		$$invalidate('color1', color1);
    		return $$result;
    	}

    	function picker1_binding($$component) {
    		p2 = $$component;
    		$$invalidate('p2', p2);
    	}

    	function colorChange_handler_1(e) {
    	          color2 = e.detail.hex; $$invalidate('color2', color2);
    	          p1.setColor(e.detail);
    	        }

    	$$self.$set = $$props => {
    		if ('color1' in $$props) $$invalidate('color1', color1 = $$props.color1);
    		if ('color2' in $$props) $$invalidate('color2', color2 = $$props.color2);
    	};

    	return {
    		p1,
    		p2,
    		color1,
    		color2,
    		picker0_binding,
    		colorChange_handler,
    		picker1_binding,
    		colorChange_handler_1
    	};
    }

    class Test extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["color1", "color2"]);
    	}

    	get color1() {
    		throw new Error("<Test>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color1(value) {
    		throw new Error("<Test>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color2() {
    		throw new Error("<Test>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color2(value) {
    		throw new Error("<Test>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const test = new Test({
    	target: document.body,
    });

}());
//# sourceMappingURL=bundle.js.map
