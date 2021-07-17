
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
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
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Static.svelte generated by Svelte v3.38.2 */

    const file$3 = "src\\Static.svelte";

    function create_fragment$3(ctx) {
    	let nav;
    	let p0;
    	let t1;
    	let div0;
    	let p1;
    	let input;
    	let t2;
    	let span0;
    	let i0;
    	let t3;
    	let p2;
    	let a0;
    	let t5;
    	let a1;
    	let t7;
    	let a2;
    	let t9;
    	let a3;
    	let t11;
    	let a4;
    	let t13;
    	let a5;
    	let span1;
    	let i1;
    	let t14;
    	let t15;
    	let a6;
    	let span2;
    	let i2;
    	let t16;
    	let t17;
    	let a7;
    	let span3;
    	let i3;
    	let t18;
    	let t19;
    	let a8;
    	let span4;
    	let i4;
    	let t20;
    	let t21;
    	let a9;
    	let span5;
    	let i5;
    	let t22;
    	let t23;
    	let a10;
    	let span6;
    	let i6;
    	let t24;
    	let t25;
    	let div1;
    	let button;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			p0 = element("p");
    			p0.textContent = "Repositories";
    			t1 = space();
    			div0 = element("div");
    			p1 = element("p");
    			input = element("input");
    			t2 = space();
    			span0 = element("span");
    			i0 = element("i");
    			t3 = space();
    			p2 = element("p");
    			a0 = element("a");
    			a0.textContent = "All";
    			t5 = space();
    			a1 = element("a");
    			a1.textContent = "Public";
    			t7 = space();
    			a2 = element("a");
    			a2.textContent = "Private";
    			t9 = space();
    			a3 = element("a");
    			a3.textContent = "Sources";
    			t11 = space();
    			a4 = element("a");
    			a4.textContent = "Forks";
    			t13 = space();
    			a5 = element("a");
    			span1 = element("span");
    			i1 = element("i");
    			t14 = text("\n    bulma");
    			t15 = space();
    			a6 = element("a");
    			span2 = element("span");
    			i2 = element("i");
    			t16 = text("\n    marksheet");
    			t17 = space();
    			a7 = element("a");
    			span3 = element("span");
    			i3 = element("i");
    			t18 = text("\n    minireset.css");
    			t19 = space();
    			a8 = element("a");
    			span4 = element("span");
    			i4 = element("i");
    			t20 = text("\n    jgthms.github.io");
    			t21 = space();
    			a9 = element("a");
    			span5 = element("span");
    			i5 = element("i");
    			t22 = text("\n    daniellowtw/infboard");
    			t23 = space();
    			a10 = element("a");
    			span6 = element("span");
    			i6 = element("i");
    			t24 = text("\n    mojs");
    			t25 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Reset all filters";
    			attr_dev(p0, "class", "panel-heading");
    			add_location(p0, file$3, 1, 2, 22);
    			attr_dev(input, "class", "input");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Search");
    			add_location(input, file$3, 6, 6, 145);
    			attr_dev(i0, "class", "fas fa-search");
    			attr_dev(i0, "aria-hidden", "true");
    			add_location(i0, file$3, 8, 8, 242);
    			attr_dev(span0, "class", "icon is-left");
    			add_location(span0, file$3, 7, 6, 206);
    			attr_dev(p1, "class", "control has-icons-left");
    			add_location(p1, file$3, 5, 4, 104);
    			attr_dev(div0, "class", "panel-block");
    			add_location(div0, file$3, 4, 2, 74);
    			attr_dev(a0, "class", "is-active");
    			add_location(a0, file$3, 14, 4, 400);
    			add_location(a1, file$3, 16, 4, 481);
    			add_location(a2, file$3, 18, 4, 547);
    			add_location(a3, file$3, 20, 4, 614);
    			add_location(a4, file$3, 22, 4, 681);
    			attr_dev(p2, "class", "panel-tabs");
    			add_location(p2, file$3, 12, 2, 325);
    			attr_dev(i1, "class", "fas fa-book");
    			attr_dev(i1, "aria-hidden", "true");
    			add_location(i1, file$3, 27, 6, 820);
    			attr_dev(span1, "class", "panel-icon");
    			add_location(span1, file$3, 26, 4, 788);
    			attr_dev(a5, "class", "panel-block is-active");
    			add_location(a5, file$3, 25, 2, 750);
    			attr_dev(i2, "class", "fas fa-book");
    			attr_dev(i2, "aria-hidden", "true");
    			add_location(i2, file$3, 34, 6, 1005);
    			attr_dev(span2, "class", "panel-icon");
    			add_location(span2, file$3, 33, 4, 973);
    			attr_dev(a6, "class", "panel-block");
    			add_location(a6, file$3, 32, 2, 945);
    			attr_dev(i3, "class", "fas fa-book");
    			attr_dev(i3, "aria-hidden", "true");
    			add_location(i3, file$3, 41, 6, 1194);
    			attr_dev(span3, "class", "panel-icon");
    			add_location(span3, file$3, 40, 4, 1162);
    			attr_dev(a7, "class", "panel-block");
    			add_location(a7, file$3, 39, 2, 1134);
    			attr_dev(i4, "class", "fas fa-book");
    			attr_dev(i4, "aria-hidden", "true");
    			add_location(i4, file$3, 48, 6, 1387);
    			attr_dev(span4, "class", "panel-icon");
    			add_location(span4, file$3, 47, 4, 1355);
    			attr_dev(a8, "class", "panel-block");
    			add_location(a8, file$3, 46, 2, 1327);
    			attr_dev(i5, "class", "fas fa-code-branch");
    			attr_dev(i5, "aria-hidden", "true");
    			add_location(i5, file$3, 55, 6, 1583);
    			attr_dev(span5, "class", "panel-icon");
    			add_location(span5, file$3, 54, 4, 1551);
    			attr_dev(a9, "class", "panel-block");
    			add_location(a9, file$3, 53, 2, 1523);
    			attr_dev(i6, "class", "fas fa-code-branch");
    			attr_dev(i6, "aria-hidden", "true");
    			add_location(i6, file$3, 62, 6, 1790);
    			attr_dev(span6, "class", "panel-icon");
    			add_location(span6, file$3, 61, 4, 1758);
    			attr_dev(a10, "class", "panel-block");
    			add_location(a10, file$3, 60, 2, 1730);
    			attr_dev(button, "class", "button is-link is-outlined is-fullwidth");
    			add_location(button, file$3, 67, 4, 1904);
    			attr_dev(div1, "class", "panel-block");
    			add_location(div1, file$3, 66, 2, 1874);
    			attr_dev(nav, "class", "panel");
    			add_location(nav, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, p0);
    			append_dev(nav, t1);
    			append_dev(nav, div0);
    			append_dev(div0, p1);
    			append_dev(p1, input);
    			append_dev(p1, t2);
    			append_dev(p1, span0);
    			append_dev(span0, i0);
    			append_dev(nav, t3);
    			append_dev(nav, p2);
    			append_dev(p2, a0);
    			append_dev(p2, t5);
    			append_dev(p2, a1);
    			append_dev(p2, t7);
    			append_dev(p2, a2);
    			append_dev(p2, t9);
    			append_dev(p2, a3);
    			append_dev(p2, t11);
    			append_dev(p2, a4);
    			append_dev(nav, t13);
    			append_dev(nav, a5);
    			append_dev(a5, span1);
    			append_dev(span1, i1);
    			append_dev(a5, t14);
    			append_dev(nav, t15);
    			append_dev(nav, a6);
    			append_dev(a6, span2);
    			append_dev(span2, i2);
    			append_dev(a6, t16);
    			append_dev(nav, t17);
    			append_dev(nav, a7);
    			append_dev(a7, span3);
    			append_dev(span3, i3);
    			append_dev(a7, t18);
    			append_dev(nav, t19);
    			append_dev(nav, a8);
    			append_dev(a8, span4);
    			append_dev(span4, i4);
    			append_dev(a8, t20);
    			append_dev(nav, t21);
    			append_dev(nav, a9);
    			append_dev(a9, span5);
    			append_dev(span5, i5);
    			append_dev(a9, t22);
    			append_dev(nav, t23);
    			append_dev(nav, a10);
    			append_dev(a10, span6);
    			append_dev(span6, i6);
    			append_dev(a10, t24);
    			append_dev(nav, t25);
    			append_dev(nav, div1);
    			append_dev(div1, button);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Static", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Static> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Static extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Static",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\Dynamic.svelte generated by Svelte v3.38.2 */

    const file$2 = "src\\Dynamic.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (49:12) {:else}
    function create_else_block(ctx) {
    	let a;
    	let t0_value = /*tag*/ ctx[11].charAt(0).toUpperCase() + /*tag*/ ctx[11].slice(1) + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[7](/*tag*/ ctx[11]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			add_location(a, file$2, 50, 16, 1476);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, t1);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", prevent_default(click_handler_1), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(49:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:12) {#if tag === currentTag}
    function create_if_block_2(ctx) {
    	let a;
    	let t_value = /*tag*/ ctx[11].charAt(0).toUpperCase() + /*tag*/ ctx[11].slice(1) + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[6](/*tag*/ ctx[11]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			t = text(t_value);
    			attr_dev(a, "class", "is-active");
    			add_location(a, file$2, 42, 16, 1153);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", prevent_default(click_handler), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(41:12) {#if tag === currentTag}",
    		ctx
    	});

    	return block;
    }

    // (40:8) {#each tags as tag}
    function create_each_block_1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*tag*/ ctx[11] === /*currentTag*/ ctx[1]) return create_if_block_2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(40:8) {#each tags as tag}",
    		ctx
    	});

    	return block;
    }

    // (70:164) 
    function create_if_block_1(ctx) {
    	let a;
    	let span;
    	let i;
    	let i_class_value;
    	let t0;
    	let t1_value = /*item*/ ctx[8].title + "";
    	let t1;

    	const block = {
    		c: function create() {
    			a = element("a");
    			span = element("span");
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(i, "class", i_class_value = "fas fa-" + /*item*/ ctx[8].icon);
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file$2, 73, 20, 2444);
    			attr_dev(span, "class", "panel-icon");
    			add_location(span, file$2, 72, 16, 2398);
    			attr_dev(a, "class", "panel-block is-active");
    			add_location(a, file$2, 71, 12, 2348);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, span);
    			append_dev(span, i);
    			append_dev(a, t0);
    			append_dev(a, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*items*/ 1 && i_class_value !== (i_class_value = "fas fa-" + /*item*/ ctx[8].icon)) {
    				attr_dev(i, "class", i_class_value);
    			}

    			if (dirty & /*items*/ 1 && t1_value !== (t1_value = /*item*/ ctx[8].title + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(70:164) ",
    		ctx
    	});

    	return block;
    }

    // (62:8) {#if currentTag === "" && !searchBarInnerText}
    function create_if_block(ctx) {
    	let a;
    	let span;
    	let i;
    	let i_class_value;
    	let t0;
    	let t1_value = /*item*/ ctx[8].title + "";
    	let t1;

    	const block = {
    		c: function create() {
    			a = element("a");
    			span = element("span");
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(i, "class", i_class_value = "fas fa-" + /*item*/ ctx[8].icon);
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file$2, 65, 20, 1991);
    			attr_dev(span, "class", "panel-icon");
    			add_location(span, file$2, 64, 16, 1945);
    			attr_dev(a, "class", "panel-block is-active");
    			add_location(a, file$2, 63, 12, 1895);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, span);
    			append_dev(span, i);
    			append_dev(a, t0);
    			append_dev(a, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*items*/ 1 && i_class_value !== (i_class_value = "fas fa-" + /*item*/ ctx[8].icon)) {
    				attr_dev(i, "class", i_class_value);
    			}

    			if (dirty & /*items*/ 1 && t1_value !== (t1_value = /*item*/ ctx[8].title + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(62:8) {#if currentTag === \\\"\\\" && !searchBarInnerText}",
    		ctx
    	});

    	return block;
    }

    // (61:4) {#each items as item}
    function create_each_block(ctx) {
    	let show_if;
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*currentTag*/ ctx[1] === "" && !/*searchBarInnerText*/ ctx[2]) return create_if_block;
    		if (show_if == null || dirty & /*items, currentTag, searchBarInnerText*/ 7) show_if = !!((/*item*/ ctx[8].tags[0] == /*currentTag*/ ctx[1] || /*item*/ ctx[8].tags[1] == /*currentTag*/ ctx[1] || /*item*/ ctx[8].tags[2] == /*currentTag*/ ctx[1]) && /*item*/ ctx[8].title.includes(/*searchBarInnerText*/ ctx[2].toLowerCase()));
    		if (show_if) return create_if_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx, -1);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx, dirty)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(61:4) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let nav;
    	let p0;
    	let t1;
    	let div0;
    	let p1;
    	let input;
    	let t2;
    	let span;
    	let i;
    	let t3;
    	let p2;
    	let t4;
    	let t5;
    	let div1;
    	let button;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*tags*/ ctx[3];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*items*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			p0 = element("p");
    			p0.textContent = "Repositories";
    			t1 = space();
    			div0 = element("div");
    			p1 = element("p");
    			input = element("input");
    			t2 = space();
    			span = element("span");
    			i = element("i");
    			t3 = space();
    			p2 = element("p");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "Reset all filters";
    			attr_dev(p0, "class", "panel-heading");
    			add_location(p0, file$2, 24, 4, 533);
    			attr_dev(input, "class", "input search-bar");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Search");
    			add_location(input, file$2, 27, 12, 660);
    			attr_dev(i, "class", "fas fa-search");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file$2, 34, 16, 892);
    			attr_dev(span, "class", "icon is-left");
    			add_location(span, file$2, 33, 12, 848);
    			attr_dev(p1, "class", "control has-icons-left");
    			add_location(p1, file$2, 26, 8, 613);
    			attr_dev(div0, "class", "panel-block");
    			add_location(div0, file$2, 25, 4, 579);
    			attr_dev(p2, "class", "panel-tabs");
    			add_location(p2, file$2, 38, 4, 987);
    			attr_dev(button, "class", "button is-link is-outlined is-fullwidth");
    			add_location(button, file$2, 80, 8, 2630);
    			attr_dev(div1, "class", "panel-block");
    			add_location(div1, file$2, 79, 4, 2596);
    			attr_dev(nav, "class", "panel");
    			add_location(nav, file$2, 23, 0, 509);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, p0);
    			append_dev(nav, t1);
    			append_dev(nav, div0);
    			append_dev(div0, p1);
    			append_dev(p1, input);
    			set_input_value(input, /*searchBarInnerText*/ ctx[2]);
    			append_dev(p1, t2);
    			append_dev(p1, span);
    			append_dev(span, i);
    			append_dev(nav, t3);
    			append_dev(nav, p2);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(p2, null);
    			}

    			append_dev(nav, t4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(nav, null);
    			}

    			append_dev(nav, t5);
    			append_dev(nav, div1);
    			append_dev(div1, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[5]),
    					listen_dev(button, "click", /*resetAllFilters*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*searchBarInnerText*/ 4 && input.value !== /*searchBarInnerText*/ ctx[2]) {
    				set_input_value(input, /*searchBarInnerText*/ ctx[2]);
    			}

    			if (dirty & /*currentTag, tags*/ 10) {
    				each_value_1 = /*tags*/ ctx[3];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(p2, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*items, currentTag, searchBarInnerText*/ 7) {
    				each_value = /*items*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(nav, t5);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Dynamic", slots, []);
    	let { items } = $$props;

    	// need to push into items.tags[] array an 'all' tag for each item
    	items.forEach(item => item.tags.push("all"));

    	let searchBarInnerText = "";
    	let currentTag = "";
    	const tags = ["all", "public", "private", "sources", "forks"];

    	function resetAllFilters() {
    		// reset the search bar
    		$$invalidate(2, searchBarInnerText = "");

    		// reset tag bar
    		$$invalidate(1, currentTag = "");
    	}

    	const writable_props = ["items"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Dynamic> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		searchBarInnerText = this.value;
    		$$invalidate(2, searchBarInnerText);
    	}

    	const click_handler = tag => {
    		$$invalidate(1, currentTag = tag);
    	};

    	const click_handler_1 = tag => {
    		$$invalidate(1, currentTag = tag);
    	};

    	$$self.$$set = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    	};

    	$$self.$capture_state = () => ({
    		items,
    		searchBarInnerText,
    		currentTag,
    		tags,
    		resetAllFilters
    	});

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    		if ("searchBarInnerText" in $$props) $$invalidate(2, searchBarInnerText = $$props.searchBarInnerText);
    		if ("currentTag" in $$props) $$invalidate(1, currentTag = $$props.currentTag);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*currentTag*/ 2) {
    			if (!currentTag) {
    				$$invalidate(1, currentTag = "all");
    			}
    		}
    	};

    	return [
    		items,
    		currentTag,
    		searchBarInnerText,
    		tags,
    		resetAllFilters,
    		input_input_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class Dynamic extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { items: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dynamic",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*items*/ ctx[0] === undefined && !("items" in props)) {
    			console.warn("<Dynamic> was created without expected prop 'items'");
    		}
    	}

    	get items() {
    		throw new Error("<Dynamic>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<Dynamic>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Task.svelte generated by Svelte v3.38.2 */

    const file$1 = "src\\Task.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let ul0;
    	let li0;
    	let t4;
    	let code;
    	let t6;
    	let t7;
    	let li1;
    	let t9;
    	let li2;
    	let t11;
    	let li3;
    	let t13;
    	let p1;
    	let t15;
    	let ul1;
    	let li4;
    	let t16;
    	let a;
    	let t18;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Your Task";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Implement the Component inside \"Dynamic.svelte\" so it looks like the one in \"Static.svelte\" with some additional features:";
    			t3 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			t4 = text("The items should be generated from the ");
    			code = element("code");
    			code.textContent = "items";
    			t6 = text(" prop.");
    			t7 = space();
    			li1 = element("li");
    			li1.textContent = "One should be able to filter the items by title using the search bar";
    			t9 = space();
    			li2 = element("li");
    			li2.textContent = "One should be able to filter the items by tag using the tab bar";
    			t11 = space();
    			li3 = element("li");
    			li3.textContent = "The \"reset filters\" button should reset all filters";
    			t13 = space();
    			p1 = element("p");
    			p1.textContent = "Some hints:";
    			t15 = space();
    			ul1 = element("ul");
    			li4 = element("li");
    			t16 = text("Styling is done with using the ");
    			a = element("a");
    			a.textContent = "bulma";
    			t18 = text(" framework");
    			add_location(h1, file$1, 1, 1, 23);
    			add_location(p0, file$1, 3, 1, 45);
    			add_location(code, file$1, 7, 45, 231);
    			add_location(li0, file$1, 7, 2, 188);
    			add_location(li1, file$1, 8, 2, 263);
    			add_location(li2, file$1, 9, 2, 343);
    			add_location(li3, file$1, 10, 2, 418);
    			add_location(ul0, file$1, 6, 1, 181);
    			add_location(p1, file$1, 13, 1, 488);
    			attr_dev(a, "href", "https://bulma.io");
    			add_location(a, file$1, 17, 37, 555);
    			add_location(li4, file$1, 17, 2, 520);
    			add_location(ul1, file$1, 16, 1, 513);
    			attr_dev(div, "class", "content");
    			add_location(div, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, p0);
    			append_dev(div, t3);
    			append_dev(div, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, t4);
    			append_dev(li0, code);
    			append_dev(li0, t6);
    			append_dev(ul0, t7);
    			append_dev(ul0, li1);
    			append_dev(ul0, t9);
    			append_dev(ul0, li2);
    			append_dev(ul0, t11);
    			append_dev(ul0, li3);
    			append_dev(div, t13);
    			append_dev(div, p1);
    			append_dev(div, t15);
    			append_dev(div, ul1);
    			append_dev(ul1, li4);
    			append_dev(li4, t16);
    			append_dev(li4, a);
    			append_dev(li4, t18);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Task", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Task> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Task extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Task",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.38.2 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let section;
    	let div;
    	let dynamic;
    	let t;
    	let hr;
    	let current;

    	dynamic = new Dynamic({
    			props: { items: /*items*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			section = element("section");
    			div = element("div");
    			create_component(dynamic.$$.fragment);
    			t = space();
    			hr = element("hr");
    			add_location(hr, file, 30, 2, 841);
    			attr_dev(div, "class", "container");
    			add_location(div, file, 26, 1, 773);
    			attr_dev(section, "class", "section");
    			add_location(section, file, 25, 0, 746);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div);
    			mount_component(dynamic, div, null);
    			append_dev(div, t);
    			append_dev(div, hr);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dynamic.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dynamic.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(dynamic);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);

    	let items = [
    		{
    			icon: "book",
    			title: "bulma",
    			tags: ["public", "sources"]
    		},
    		{
    			icon: "book",
    			title: "marksheet",
    			tags: ["private"]
    		},
    		{
    			icon: "book",
    			title: "minireset.css",
    			tags: ["public", "sources"]
    		},
    		{
    			icon: "code-branch",
    			title: "daniellowtw/infboard",
    			tags: ["public", "forks"]
    		},
    		{
    			icon: "code-branch",
    			title: "mojs",
    			tags: ["private"]
    		}
    	];

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Static, Dynamic, Task, items });

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) $$invalidate(0, items = $$props.items);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [items];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
