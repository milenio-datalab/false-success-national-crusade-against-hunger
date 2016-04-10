var Vis = (function () {

    var _container_id;
    var _container;
    var _bbox;
    var _width;
    var _height;
    var _svg;
    var _g;
    var _padding;
    var _fmt_porcentaje = d3.format('.0f');
    var _fmt_clave_municipio = d3.format('05d');

    var _color_scale;
    var _g_municipios;
    var _ancho_mun = 6;
    var _ancho_mun_s = _ancho_mun + 1;
    var _g_levels;
    var _entidad_seleccionada;
    var _municipio_seleccionado;

    var _info_nacional = {
        cobertura_programas: 63.65 / 100,
        cobertura_prog_hambre: 51.37 / 100,
        cve_ent: 33,
        mun: '--'
    };

    // Scale
    var _g_scale;

    // UI
    var _g_ui;

    // Data
    var _data_cobertura;
    var _data_ent_mun;

    /*
     Constructor
     */

    function Vis(container_id) {
        _container_id = container_id;
        _container = d3.select('#' + _container_id);
        _bbox = document.getElementById(_container_id).getBoundingClientRect();
        _width = _bbox.width;
        _height = _width;
        _padding = 10;

        this.render();
    }

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
    };

    var _resize_svg = function () {
        _svg.attr('height', _g.node().getBBox().height);
    };

    var _draw = function () {
        _create_svg_container();
        _draw_ui();
        _draw_scale();
        _draw_tp();
        _resize_svg();
        _show_municipio_info(_info_nacional);
    };

    var _load_data = function (fn) {
        queue()
            .defer(d3.csv, 'data/cobertura_cnch.csv')
            .defer(d3.csv, 'data/estados_municipios.csv')
            .await(function (error, cobertura, ent_mun) {
                _data_cobertura = cobertura;
                _data_ent_mun = ent_mun;

                var max = d3.max(_data_cobertura, function (d) {
                    return +d.cobertura_programas;
                });

                _color_scale = d3.scale.linear()
                    .domain([0, 25, 50, 75, 100, 101, max * 100])
                    .range(["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641", "#1998CD", "#8B2F82"]);

                _data_cobertura.forEach(function (d, idx) {
                    d.cve_mun = _fmt_clave_municipio(d.id_mun);
                    d.cve_ent = d.cve_mun.substring(0, 2);
                });

                _data_cobertura.sort(function (a, b) {
                    return b.cobertura_programas - a.cobertura_programas;
                });
                _data_cobertura.forEach(function (d, idx) {
                    d.orden_tp = idx;
                });

                _data_cobertura.sort(function (a, b) {
                    return b.cobertura_prog_hambre - a.cobertura_prog_hambre;
                });
                _data_cobertura.forEach(function (d, idx) {
                    d.orden_ph = idx;
                });

                fn();
            });
    };

    var _draw_tp = function () {
        _g_municipios = _g.append('g')
            .attr('class', 'g-municipios')
            .attr('transform', 'translate(0, ' + (40 + _g_ui.node().getBBox().height + 40) + ')');

        _g_municipios.selectAll('rect')
            .data(_data_cobertura)
            .enter()
            .append('rect')
            .attr('class', function (d, i) {
                return 'municipio cve-ent-' + d.cve_ent + ' cve-mun-' + d.cve_mun;
            })
            .attr('x', function (d, i) {
                return _calculate_position_tp_ph(d.orden_tp, d.cobertura_programas)[0];
            })
            .attr('y', function (d, i) {
                return _calculate_position_tp_ph(d.orden_tp, d.cobertura_programas)[1];
            })
            .attr('width', 6)
            .attr('height', 6)
            .style("fill", function (d) {
                return (typeof _color_scale(Math.floor(+d.cobertura_programas * 100)) == "string" ? _color_scale(Math.floor(+d.cobertura_programas * 100)) : "");
            })
            .on('click', _show_municipio_info)
            .on("mouseover", showTooltip)
            .on("mousemove", moveTooltip)
            .on("mouseout", hideTooltip);

        _draw_levels('tp');
    };

    var y_scale = d3.scale.threshold()
        .domain([0, 21, 41, 61, 81, 101])
        .range([6, 5, 4, 3, 2, 1, 0]);

    var _calculate_position_tp_ph = function (i, c) {
        var padding = 15;
        var width = 6;
        var width_s = width + 1;
        var cobertura = +c * 100;
        var y_offset = y_scale(cobertura) * width_s * 2;
        var j = i % 64;
        var x = padding + (width_s * j);
        var k = Math.floor(i / 64);
        var y = (width_s * k) + y_offset;
        return [x, y];
    };

    var _tipo_vis_municipios;

    var _update_municipios = function (tipo) {
        if (_tipo_vis_municipios != tipo) {
            _g_municipios.selectAll('rect')
                .transition()
                .duration(500)
                .delay(function (d, i) {
                    return i / 5;
                })
                .attr('x', function (d) {
                    if (tipo == 'tp') {
                        return _calculate_position_tp_ph(d.orden_tp, d.cobertura_programas)[0];
                    }
                    return _calculate_position_tp_ph(d.orden_ph, d.cobertura_prog_hambre)[0];
                })
                .attr('y', function (d) {
                    if (tipo == 'tp') {
                        return _calculate_position_tp_ph(d.orden_tp, d.cobertura_programas)[1];
                    }
                    return _calculate_position_tp_ph(d.orden_ph, d.cobertura_prog_hambre)[1];
                })
                .attr('width', 6)
                .attr('height', 6);
            _tipo_vis_municipios = tipo;
            _update_levels(tipo);
        }
    };


    var levels_tp = [-1 * _ancho_mun_s, 6 * _ancho_mun_s, 10 * _ancho_mun_s, 17 * _ancho_mun_s, 28 * _ancho_mun_s, 42 * _ancho_mun_s, 50 * _ancho_mun_s];
    var levels_ph = [-1 * _ancho_mun_s, 4 * _ancho_mun_s, 8 * _ancho_mun_s, 13 * _ancho_mun_s, 22 * _ancho_mun_s, 37 * _ancho_mun_s, 50 * _ancho_mun_s];
    var levels_tp_text = ['1,516%', '100%', '80%', '60%', '40%', '20%', '0%'];
    var levels_th_text = ['1,325%', '100%', '80%', '60%', '40%', '20%', '0%'];
    var _draw_levels = function (tipo) {
        d3.select('g.g-legends').remove();
        d3.select('g.g-levels').remove();
        _g_levels = _g.append('g')
            .attr('class', 'g-levels')
            .attr('transform', 'translate(0, ' + (40 + _g_ui.node().getBBox().height + 40) + ')');

        var levels = (tipo == 'tp') ? levels_tp : levels_ph;
        var levels_text = (tipo == 'tp') ? levels_tp_text : levels_th_text;

        levels.forEach(function (d, i) {
            _g_levels.append('line')
                .attr('class', 'level-line')
                .attr('x1', 15)
                .attr('y1', levels[i])
                .attr('x2', 35)
                .attr('y2', levels[i])
                .style('stroke-width', 1)
                .style('stroke', '#333')
                .style('opacity', 0)
                .transition()
                .duration(1500)
                .style('opacity', 1);

            _g_levels.append('text')
                .attr('class', 'level-text')
                .attr('x', 40)
                .attr('y', levels[i])
                .style('dominant-baseline', 'central')
                .text(levels_text[i]).style('opacity', 0)
                .transition()
                .duration(1500)
                .style('opacity', 1);
        });
    };

    var _update_levels = function (tipo) {
        var levels = (tipo == 'tp') ? levels_tp : levels_ph;
        var levels_text = (tipo == 'tp') ? levels_tp_text : levels_th_text;
        d3.selectAll('line.level-line').each(function (d, i) {
            d3.select(this)
                .transition().duration(1000)
                .attr('y1', levels[i]).attr('y2', levels[i])
        });
        d3.selectAll('text.level-text').each(function (d, i) {
            d3.select(this)
                .transition().duration(1000)
                .text(levels_text[i])
                .attr('y', levels[i]);
        });
    };

    var _show_municipio_info = function (municipio) {
        var tp = Math.floor(municipio.cobertura_programas * 100);
        var ph = Math.floor(municipio.cobertura_prog_hambre * 100);
        d3.select('div#viz-info span.info-entidad').html(_entidad2(parseInt(municipio.cve_ent)));
        d3.select('div#viz-info span.info-municipio').html(municipio.mun);
        d3.select('div#viz-info span.info-cobertura-tp').html(_fmt_porcentaje(tp) + '%');
        d3.select('div#viz-info span.info-cobertura-ph').html(_fmt_porcentaje(ph) + '%');
        d3.select('div#viz-info td.porcentaje.tp').style("background-color", (typeof _color_scale(tp) == "string" ? _color_scale(tp) : ""));
        d3.select('div#viz-info td.porcentaje.ph').style("background-color", (typeof _color_scale(ph) == "string" ? _color_scale(ph) : ""));
        _seleccionar_municipio(municipio);
    };

    var _msg_ayotzinapa = true;

    var _seleccionar_municipio = function (municipio) {

        if (municipio.id_mun == '12035' && _msg_ayotzinapa) {
            console.log('Nos faltan 43. Vivos se los llevaron, vivos los queremos.');
            _msg_ayotzinapa = false;
        }
        if (municipio.cve_ent <= 32) {
            if (_entidad_seleccionada == municipio.cve_ent) {
                d3.selectAll('.municipio')
                    .classed('disabled', false)
                    .classed('selected', false)
                    .classed('selected-extra', false);
                _entidad_seleccionada = undefined;
                _show_municipio_info(_info_nacional);
            } else {
                _entidad_seleccionada = municipio.cve_ent;
                d3.selectAll('.municipio')
                    .classed('disabled', true)
                    .classed('selected', false)
                    .classed('selected-extra', false);
                d3.selectAll('.municipio.cve-ent-' + municipio.cve_ent)
                    .classed('disabled', false)
                    .classed('selected', true);
                d3.selectAll('.municipio.cve-mun-' + municipio.cve_mun)
                    .classed('selected-extra', true);
            }
        }
    };

    var _draw_scale = function () {
        _g_scale = _g.append('g')
            .attr('class', 'g-scale')
            .attr('transform', 'translate(0, ' + (_g_ui.node().getBBox().height + 20) + ')');
        var scale = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 101, 1500];
        var scale2 = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, '+100', 1500];
        var ancho = (478 - 15 * 2) / scale.length;

        _g_scale.append('text')
            .attr('class', 'scale-legend')
            .attr('x', 15)
            .attr('y', 8)
            .style('font-size', 10)
            .text('Coverage with programs for people who suffer from extreme poverty and malnourisment');

        scale.forEach(function (d, i) {
            _g_scale.append('rect')
                .attr('x', 15 + i * ancho)
                .attr('y', 12)
                .attr('width', ancho)
                .attr('height', 10)
                .attr('stroke', '#fff')
                .attr('fill', _color_scale(d));
            _g_scale.append('text')
                .attr('class', 'scale-legend')
                .attr('x', 15 + i * ancho)
                .attr('y', 32)
                .style('font-size', 10)
                .text(scale2[i] + '%');

        });
    };

    var _draw_ui = function () {
        _g_ui = _g.append('g').attr('id', 'g-ui')
            .attr('transform', 'translate(0, ' + (0) + ')');

        var ancho_boton = (_width - 15 * 3) / 2;
        var alto_boton = 30;

        _g_ui.append('rect')
            .attr('class', 'selected')
            .attr('x', 15)
            .attr('y', 0)
            .attr('width', ancho_boton)
            .attr('height', alto_boton)
            .on('click', function () {
                d3.selectAll('#g-ui rect').classed('selected', false);
                d3.select(this).classed('selected', true);
                _update_municipios('tp');
            });

        _g_ui.append('text')
            .attr('class', 'button-text')
            .attr('x', 15 + ancho_boton / 2)
            .attr('y', alto_boton / 2)
            .style('dominant-baseline', 'central')
            .text('All programs');

        _g_ui.append('rect')
            .attr('x', 15 * 2 + ancho_boton)
            .attr('y', 0)
            .attr('width', ancho_boton)
            .attr('height', alto_boton)
            .on('click', function () {
                d3.selectAll('#g-ui rect').classed('selected', false);
                d3.select(this).classed('selected', true);
                _update_municipios('ph');
            });

        _g_ui.append('text')
            .attr('class', 'button-text')
            .attr('x', 15 * 2 + ancho_boton + ancho_boton / 2)
            .attr('y', alto_boton / 2)
            .style('dominant-baseline', 'central')
            .text('Only programs that combat hunger');
    };

    var tooltipOffset = {x: 5, y: -32};
    var tooltip = d3.select("body").append("div").attr("class", "tooltip");
    var showTooltip = function (d) {
        moveTooltip();
        tooltip.style("display", "block").text(d.mun + ' (' + _entidad(d.cve_ent) + ')');
    };
    var moveTooltip = function () {
        tooltip.style("top", (d3.event.pageY + tooltipOffset.y) + "px")
            .style("left", (d3.event.pageX + tooltipOffset.x) + "px");
    };
    var hideTooltip = function () {
        tooltip.style("display", "none");
    };

    var _entidad = function (i) {
        var entidades = [
            'AGS',
            'BC',
            'BCS',
            'CAMP',
            'COAH',
            'COL',
            'CHIS',
            'CHIH',
            'CDMX',
            'DGO',
            'GTO',
            'GRO',
            'HGO',
            'JAL',
            'MEX',
            'MICH',
            'MOR',
            'NAY',
            'NL',
            'OAX',
            'PUE',
            'QRO',
            'QROO',
            'SLP',
            'SIN',
            'SON',
            'TAB',
            'TAMPS',
            'TLAX',
            'VER',
            'YUC',
            'ZAC'
        ];
        return entidades[parseInt(i - 1)];
    };

    var _entidad2 = function (i) {
        var entidades = [
            'Aguascalientes',
            'Baja California',
            'Baja California Sur',
            'Campeche',
            'Coahuila',
            'Colima',
            'Chiapas',
            'Chihuahua',
            'Ciudad de México',
            'Durango',
            'Guanajuato',
            'Guerrero',
            'Hidalgo',
            'Jalisco',
            'Estado de México',
            'Michoacán',
            'Morelos',
            'Nayarit',
            'Nuevo León',
            'Oaxaca',
            'Puebla',
            'Querétaro',
            'Quintana Roo',
            'San Luis Potosí',
            'Sinaloa',
            'Sonora',
            'Tabasco',
            'Tamaulipas',
            'Tlaxcala',
            'Veracruz',
            'Yucatán',
            'Zacatecas',
            'All the country'
        ];
        return entidades[parseInt(i - 1)];
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

new Vis('vis');
