var Vis = (function () {

    var _container_id;
    var _container;
    var _bbox;
    var _width;
    var _height;
    var _svg;
    var _g;
    var _g_buttons;
    var _g_bars;
    var _g_squares;
    var _max_width;
    var _padding;
    var _data;
    var _data_peca;
    var _animation_duration = 500;
    var _bars_scale;
    var _fmt_poblacion = d3.format(',d');
    var _bars_x_pos;
    var _font_size = 18;
    var _labels_font_size;
    var _buttons_height = _font_size * 1.5;
    var _bars_height = _buttons_height;
    var _space_between_bars;
    var _squares_scale;
    var _square_max_area;

    var _rect_pe;
    var _text_pe;
    var _rect_ca;
    var _text_ca;
    var _rect_peca;
    var _text_peca;

    var _texture_lines;

    /*
     Constructor
     */

    function Vis(container_id) {
        _container_id = container_id;
        _container = d3.select('#' + _container_id);
        _bbox = document.getElementById(_container_id).getBoundingClientRect();
        _width = _bbox.width;
        _height = _width / 2;
        _max_width = 1160;
        _padding = _scale(20);
        if (_width < 600) {
            _labels_font_size = _bars_height / 2.5;
            _space_between_bars = _padding*0.75;
            _square_max_area = 130 * 130;
        } else if (_width < 1200) {
            _labels_font_size = _bars_height / 2.5;
            _space_between_bars = _padding / 1.5;
            _square_max_area = 220 * 220;
        } else {
            _labels_font_size = _bars_height / 2;
            _space_between_bars = _padding / 3;
            _square_max_area = 220 * 220;
        }
        this.render();
    }

    /*
     Util methods
     */

    var _scale = function (value) {
        return value * _width / _max_width;
    };

    var _do_click = function (element) {
        var e = document.createEvent('UIEvents');
        e.initUIEvent('click', true, true);
        element.node().dispatchEvent(e);
    };

    /*
     Private methods
     */

    var _delete_vis = function () {
        _container.html('');
    };

    var _create_svg_container = function () {
        _svg = _container.append('svg')
            .attr('width', _width)
            .attr('height', _height);
        _g = _svg.append('g');

        _texture_lines = textures.lines()
            .size(3)
            .strokeWidth(1)
            .stroke("#eee")
            .background("#bbb");
        _svg.call(_texture_lines);
    };

    var _resize_svg = function () {
        _svg.attr('height', _g.node().getBBox().height);
    };

    var _draw_ui = function () {
        var g_ui = _g.append('g').attr('id', 'g-ui');
        _g_buttons = g_ui;
        var ui_button_width = (_width - 4 * _padding) / 3;
        var ui_button_height = _buttons_height;
        _draw_ui_button(g_ui, _padding, _padding, ui_button_width, ui_button_height, '2010', true);
        _draw_ui_button(g_ui, _padding * 2 + ui_button_width, _padding, ui_button_width, ui_button_height, '2012', false);
        _draw_ui_button(g_ui, _padding * 3 + ui_button_width * 2, _padding, ui_button_width, ui_button_height, '2014', false);
    };

    var _draw_ui_button = function (g, x, y, width, height, button_text, selected) {
        var rect = g.append('rect')
            .attr('class', 'ui-button')
            .attr('x', x)
            .attr('y', y)
            .attr('width', width)
            .attr('height', height);
        rect.on('click', function () {
            d3.selectAll('rect.ui-button').classed('selected', false);
            d3.select(this).classed('selected', true);
            _update_bars(button_text);
            _update_squares(button_text)
        });

        if (selected) {
            rect.classed('selected', true);
        }

        var text = g.append('text')
            .attr('class', 'ui-button')
            .attr('x', x + width / 2)
            .attr('y', y + height / 2)
            .style('dominant-baseline', 'central')
            .style('font-size', _buttons_height / 2)
            .style('font-weight', 400)
            .text(button_text);
        return rect;
    };

    var _draw_bars = function (anyo) {
        var g_bars = _g.append('g')
            .attr('id', 'g-bars')
            .attr('transform', 'translate(0, ' + (_buttons_height + _padding * 2) + ')');

        var texts = [];
        texts.push(g_bars.append('text')
            .attr('class', 'bar-text sin-pobreza')
            .attr('x', _padding)
            .attr('y', _bars_height / 2)
            .style('dominant-baseline', 'middle')
            .style('font-size', _labels_font_size)
            .style('font-weight', 400)
            .text('Without poverty '));
        texts.push(g_bars.append('text')
            .attr('class', 'bar-text pobreza-moderada')
            .attr('x', _padding)
            .attr('y', _bars_height + _space_between_bars + _bars_height / 2)
            .style('dominant-baseline', 'middle')
            .style('font-size', _labels_font_size)
            .style('font-weight', 400)
            .text('Moderate poverty'));
        texts.push(g_bars.append('text')
            .attr('class', 'bar-text pobreza-extrema')
            .attr('x', _padding)
            .attr('y', _bars_height * 2 + _space_between_bars * 2 + _bars_height / 2)
            .style('dominant-baseline', 'middle')
            .style('font-size', _labels_font_size)
            .style('font-weight', 400)
            .text('Extreme poverty '));

        /*
         _bars_x_pos = d3.max(texts, function (e) {
         return e.node().getBBox().width;
         });
         */
        _bars_x_pos = 137;

        _bars_scale = d3.scale.linear()
            .domain([0, 65000000])
            .range([0, _width - (_padding * 2) - _bars_x_pos]);

        var anyo_data = _data.find(function (element) {
            return element.anyo == anyo;
        });

        g_bars.append('rect')
            .attr('class', 'bar-rect fondo')
            .attr('x', _bars_x_pos + _padding)
            .attr('y', 0)
            .attr('width', 0)
            .attr('height', _bars_height)
            .attr('width', _bars_scale(65000000))
            .style("fill", _texture_lines.url());
        g_bars.append('rect')
            .attr('class', 'bar-rect sin-pobreza')
            .attr('x', _bars_x_pos + _padding)
            .attr('y', 0)
            .attr('width', 0)
            .attr('height', _bars_height)
            .transition().duration(_animation_duration)
            .attr('width', _bars_scale(anyo_data.sin_pobreza));
        g_bars.append('text')
            .attr('class', 'bar-rect-text sin-pobreza')
            .attr('x', _bars_x_pos + _padding * 2)
            .attr('y', _bars_height / 2)
            .style('dominant-baseline', 'central')
            .style('font-size', _bars_height / 3)
            .style('font-weight', 400)
            .text(_fmt_poblacion(anyo_data.sin_pobreza));

        g_bars.append('rect')
            .attr('class', 'bar-rect fondo')
            .attr('x', _bars_x_pos + _padding)
            .attr('y', _bars_height + _space_between_bars)
            .attr('width', 0)
            .attr('height', _bars_height)
            .attr('width', _bars_scale(65000000))
            .style("fill", _texture_lines.url());
        g_bars.append('rect')
            .attr('class', 'bar-rect pobreza-moderada')
            .attr('x', _bars_x_pos + _padding)
            .attr('y', _bars_height + _space_between_bars)
            .attr('width', 0)
            .attr('height', _bars_height)
            .transition().duration(_animation_duration)
            .attr('width', _bars_scale(anyo_data.pobreza_moderada));
        g_bars.append('text')
            .attr('class', 'bar-rect-text pobreza-moderada')
            .attr('x', _bars_x_pos + _padding * 2)
            .attr('y', _bars_height + _space_between_bars + _bars_height / 2)
            .style('dominant-baseline', 'central')
            .style('font-size', _bars_height / 3)
            .style('font-weight', 400)
            .text(_fmt_poblacion(anyo_data.pobreza_moderada));

        g_bars.append('rect')
            .attr('class', 'bar-rect fondo')
            .attr('x', _bars_x_pos + _padding)
            .attr('y', _bars_height * 2 + _space_between_bars * 2)
            .attr('width', 0)
            .attr('height', _bars_height)
            .attr('width', _bars_scale(65000000))
            .style("fill", _texture_lines.url());
        g_bars.append('rect')
            .attr('class', 'bar-rect pobreza-extrema')
            .attr('x', _bars_x_pos + _padding)
            .attr('y', _bars_height * 2 + _space_between_bars * 2)
            .attr('width', 0)
            .attr('height', _bars_height)
            .transition().duration(_animation_duration)
            .attr('width', _bars_scale(anyo_data.pobreza_extrema));
        g_bars.append('text')
            .attr('class', 'bar-rect-text pobreza-extrema')
            .attr('x', _bars_x_pos + _padding * 2)
            .attr('y', _bars_height * 2 + _space_between_bars * 2 + _bars_height / 2)
            .style('dominant-baseline', 'central')
            .style('font-size', _bars_height / 3)
            .style('font-weight', 400)
            .text(_fmt_poblacion(anyo_data.pobreza_extrema));

        _g_bars = g_bars;
    };

    var _update_bars = function (anyo) {
        var anyo_data = _data.find(function (element) {
            return element.anyo == anyo;
        });
        d3.select('.bar-rect.pobreza-extrema')
            .transition()
            .duration(_animation_duration)
            .attr('width', _bars_scale(anyo_data.pobreza_extrema));
        d3.select('.bar-rect-text.pobreza-extrema')
            .text(_fmt_poblacion(anyo_data.pobreza_extrema));

        d3.select('.bar-rect.pobreza-moderada')
            .transition()
            .duration(_animation_duration)
            .attr('width', _bars_scale(anyo_data.pobreza_moderada));
        d3.select('.bar-rect-text.pobreza-moderada')
            .transition()
            .duration(_animation_duration)
            .text(_fmt_poblacion(anyo_data.pobreza_moderada));

        d3.select('.bar-rect.sin-pobreza')
            .transition()
            .duration(_animation_duration)
            .attr('width', _bars_scale(anyo_data.sin_pobreza));
        d3.select('.bar-rect-text.sin-pobreza')
            .text(_fmt_poblacion(anyo_data.sin_pobreza));
    };

    var _draw_squares = function (anyo) {
        var anyo_data = _data_peca.find(function (element) {
            return element.anyo == anyo;
        });
        var squares_y_offset = _g_buttons.node().getBBox().height + _g_bars.node().getBBox().height + _padding * 6;

        _squares_scale = d3.scale.linear()
            .domain([0, 30000000])
            .range([0, _square_max_area]);

        var g_squares = _g.append('g')
            .attr('id', 'g-squares')
            .attr('transform', 'translate(0, ' + squares_y_offset + ')');

        g_squares.append('line').attr('stroke-dasharray', '5, 5').attr('x1', 0).attr('y1', 250 / 2).attr('x2', _width).attr('y2', 250 / 2).style('stroke', '#ddd').style('stroke-width', 1);
        g_squares.append('line').attr('stroke-dasharray', '5, 5').attr('x1', _width / 2).attr('y1', 0).attr('x2', _width / 2).attr('y2', 250).style('stroke', '#ddd').style('stroke-width', 1);

        var peca_area = _squares_scale(anyo_data.pobreza_extrema_ca);
        var peca_width = Math.sqrt(peca_area);
        var peca_oofset = peca_width / Math.sqrt(2);

        var pe_area = _squares_scale(anyo_data.pobreza_extrema);
        var pe_width = Math.sqrt(pe_area);
        var pe_oofset = pe_width / Math.sqrt(2);
        var pe_pos_x = _width / 2 + pe_oofset - peca_oofset;
        var pe_pos_y = 250 / 2 - pe_oofset;
        _rect_pe = g_squares.append('rect')
            .attr('class', 'pobreza-extrema')
            .attr('x', pe_pos_x)
            .attr('y', pe_pos_y)
            .attr('width', pe_width)
            .attr('height', pe_width)
            .attr('transform', 'rotate(45, ' + pe_pos_x + ', ' + pe_pos_y + ')');
        _text_pe = g_squares.append('text')
            .attr('class', 'pobreza-extrema')
            .attr('x', _width / 2 + pe_oofset - peca_oofset - 5)
            .attr('y', 250 / 2 + 15 + pe_oofset)
            .style('dominant-baseline', 'central')
            .style('font-size', _labels_font_size)
            .style('font-weight', 400)
            .text('Extreme poverty: ' + _fmt_poblacion(anyo_data.pobreza_extrema));

        var ca_area = _squares_scale(anyo_data.carencia_alimentacion);
        var ca_width = Math.sqrt(ca_area);
        var ca_oofset = ca_width / Math.sqrt(2);
        var ca_pos_x = _width / 2 - ca_oofset + peca_oofset;
        var ca_pos_y = 250 / 2 - ca_oofset;
        _rect_ca = g_squares.append('rect')
            .attr('class', 'carencia-alimentaria')
            .attr('x', ca_pos_x)
            .attr('y', ca_pos_y)
            .attr('width', ca_width)
            .attr('height', ca_width)
            .attr('transform', 'rotate(45, ' + ca_pos_x + ', ' + ca_pos_y + ')');
        _text_ca = g_squares.append('text')
            .attr('class', 'carencia-alimentaria')
            .attr('x', ca_pos_x - 5)
            .attr('y', ca_pos_y - 15)
            .style('dominant-baseline', 'central')
            .style('font-size', _labels_font_size)
            .style('font-weight', 400)
            .text('Malnourishment: ' + _fmt_poblacion(anyo_data.carencia_alimentacion));

        var peca_pos_x = _width / 2;
        var peca_pos_y = 250 / 2 - peca_oofset;
        _rect_peca = g_squares.append('rect')
            .attr('class', 'pobreza-extrema-ca')
            .attr('x', peca_pos_x)
            .attr('y', peca_pos_y)
            .attr('width', peca_width)
            .attr('height', peca_width)
            .attr('transform', 'rotate(45, ' + peca_pos_x + ', ' + peca_pos_y + ')');
        _text_peca = g_squares.append('text')
            .attr('class', 'pobreza-extrema-ca')
            .attr('x', _width / 2)
            .attr('y', 0)
            .style('dominant-baseline', 'central')
            .style('font-size', _labels_font_size * 1.2)
            .style('text-anchor', 'middle')
            .style('font-variant', 'small-caps')
            .style('font-weight', 400)
            .text('Extreme poverty + Malnourishment: ' + _fmt_poblacion(anyo_data.pobreza_extrema_ca));


        _text_ca.on('mouseover', function () {
            _text_ca.classed('transparent', false);
            _text_pe.classed('transparent', true);
            _text_peca.classed('transparent', true);
            _rect_ca.classed('transparent', false);
            _rect_pe.classed('transparent', true);
            _rect_peca.classed('transparent', true);
        }).on('mouseout', function(){
            _text_ca.classed('transparent', false);
            _text_pe.classed('transparent', false);
            _text_peca.classed('transparent', false);
            _rect_ca.classed('transparent', false);
            _rect_pe.classed('transparent', false);
            _rect_peca.classed('transparent', false);
        });

        _rect_ca.on('mouseover', function () {
            _text_ca.classed('transparent', false);
            _text_pe.classed('transparent', true);
            _text_peca.classed('transparent', true);
            _rect_ca.classed('transparent', false);
            _rect_pe.classed('transparent', true);
            _rect_peca.classed('transparent', true);
        }).on('mouseout', function(){
            _text_ca.classed('transparent', false);
            _text_pe.classed('transparent', false);
            _text_peca.classed('transparent', false);
            _rect_ca.classed('transparent', false);
            _rect_pe.classed('transparent', false);
            _rect_peca.classed('transparent', false);
        });

        _text_pe.on('mouseover', function () {
            _text_ca.classed('transparent', true);
            _text_pe.classed('transparent', false);
            _text_peca.classed('transparent', true);
            _rect_ca.classed('transparent', true);
            _rect_pe.classed('transparent', false);
            _rect_peca.classed('transparent', true);
        }).on('mouseout', function(){
            _text_ca.classed('transparent', false);
            _text_pe.classed('transparent', false);
            _text_peca.classed('transparent', false);
            _rect_ca.classed('transparent', false);
            _rect_pe.classed('transparent', false);
            _rect_peca.classed('transparent', false);
        });

        _rect_pe.on('mouseover', function () {
            _text_ca.classed('transparent', true);
            _text_pe.classed('transparent', false);
            _text_peca.classed('transparent', true);
            _rect_ca.classed('transparent', true);
            _rect_pe.classed('transparent', false);
            _rect_peca.classed('transparent', true);
        }).on('mouseout', function(){
            _text_ca.classed('transparent', false);
            _text_pe.classed('transparent', false);
            _text_peca.classed('transparent', false);
            _rect_ca.classed('transparent', false);
            _rect_pe.classed('transparent', false);
            _rect_peca.classed('transparent', false);
        });

        _text_peca.on('mouseover', function () {
            _text_ca.classed('transparent', true);
            _text_pe.classed('transparent', true);
            _text_peca.classed('transparent', false);
            _rect_ca.classed('transparent', true);
            _rect_pe.classed('transparent', true);
            _rect_peca.classed('transparent', false);
        }).on('mouseout', function(){
            _text_ca.classed('transparent', false);
            _text_pe.classed('transparent', false);
            _text_peca.classed('transparent', false);
            _rect_ca.classed('transparent', false);
            _rect_pe.classed('transparent', false);
            _rect_peca.classed('transparent', false);
        });

        _rect_peca.on('mouseover', function () {
            _text_ca.classed('transparent', true);
            _text_pe.classed('transparent', true);
            _text_peca.classed('transparent', false);
            _rect_ca.classed('transparent', true);
            _rect_pe.classed('transparent', true);
            _rect_peca.classed('transparent', false);
        }).on('mouseout', function(){
            _text_ca.classed('transparent', false);
            _text_pe.classed('transparent', false);
            _text_peca.classed('transparent', false);
            _rect_ca.classed('transparent', false);
            _rect_pe.classed('transparent', false);
            _rect_peca.classed('transparent', false);
        });

    };

    var _update_squares = function (anyo) {
        var anyo_data = _data_peca.find(function (element) {
            return element.anyo == anyo;
        });

        var peca_area = _squares_scale(anyo_data.pobreza_extrema_ca);
        var peca_width = Math.sqrt(peca_area);
        var peca_oofset = peca_width / Math.sqrt(2);

        var pe_area = _squares_scale(anyo_data.pobreza_extrema);
        var pe_width = Math.sqrt(pe_area);
        var pe_oofset = pe_width / Math.sqrt(2);
        var pe_pos_x = _width / 2 + pe_oofset - peca_oofset;
        var pe_pos_y = 250 / 2 - pe_oofset;
        _rect_pe.transition().duration(_animation_duration)
            .attr('x', pe_pos_x)
            .attr('y', pe_pos_y)
            .attr('width', pe_width)
            .attr('height', pe_width)
            .attr('transform', 'rotate(45, ' + pe_pos_x + ', ' + pe_pos_y + ')');
        _text_pe.transition().duration(_animation_duration)
            .attr('x', _width / 2 + pe_oofset - peca_oofset - 5)
            .attr('y', 250 / 2 + 15 + pe_oofset)
            .text('Extreme poverty: ' + _fmt_poblacion(anyo_data.pobreza_extrema));

        var ca_area = _squares_scale(anyo_data.carencia_alimentacion);
        var ca_width = Math.sqrt(ca_area);
        var ca_oofset = ca_width / Math.sqrt(2);
        var ca_pos_x = _width / 2 - ca_oofset + peca_oofset;
        var ca_pos_y = 250 / 2 - ca_oofset;
        _rect_ca.transition().duration(_animation_duration)
            .attr('x', ca_pos_x)
            .attr('y', ca_pos_y)
            .attr('width', ca_width)
            .attr('height', ca_width)
            .attr('transform', 'rotate(45, ' + ca_pos_x + ', ' + ca_pos_y + ')');
        _text_ca.transition().duration(_animation_duration)
            .attr('x', ca_pos_x - 5)
            .attr('y', ca_pos_y - 15)
            .text('Malnourishment: ' + _fmt_poblacion(anyo_data.carencia_alimentacion));

        var peca_pos_x = _width / 2;
        var peca_pos_y = 250 / 2 - peca_oofset;
        _rect_peca.transition().duration(_animation_duration)
            .attr('x', peca_pos_x)
            .attr('y', peca_pos_y)
            .attr('width', peca_width)
            .attr('height', peca_width)
            .attr('transform', 'rotate(45, ' + peca_pos_x + ', ' + peca_pos_y + ')');
        _text_peca.transition().duration(_animation_duration)
            .attr('x', _width / 2)
            .text('Extreme poverty + Malnourishment: ' + _fmt_poblacion(anyo_data.pobreza_extrema_ca));
    };

    var _draw = function () {
        _create_svg_container();
        var anyo = '2010';
        _draw_ui();
        _draw_bars(anyo);
        _draw_squares(anyo);
        _resize_svg();
    };

    var _load_data = function (fn) {
        queue()
            .defer(d3.csv, 'data/contexto_pobreza.csv')
            .defer(d3.csv, 'data/pobreza_extrema_ca.csv')
            .await(function (error, one, two) {
                _data = one;
                _data_peca = two;
                fn();
            });
    };

    /*
     Public methods
     */

    Vis.prototype = {
        render: function () {
            _delete_vis();
            _load_data(_draw);
        }
    };

    return Vis;

})();

new Vis('vis-distribucion-pobreza');
