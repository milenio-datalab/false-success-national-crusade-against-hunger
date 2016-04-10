var Vis = (function () {

    var _container_id;
    var _container;
    var _bbox;
    var _width;
    var _height;
    var _svg;
    var _g;
    var _max_width;
    var _padding;
    var _fmt_porcentaje = d3.format('.2f');

    // Map
    var _map_width;
    var _map_height;
    var _map_projection;
    var _map_path;
    var _map_g;
    var _map_g_municipios;
    var _map_g_estados;
    var _map_zoom;
    var _map_color_scale;

    // UI
    var _ui_g;

    // Data
    var _data_municipios;
    var _data_estados;

    /*
     Constructor
     */

    function Vis(container_id) {
        _container_id = container_id;
        _container = d3.select('#' + _container_id);
        _bbox = document.getElementById(_container_id).getBoundingClientRect();
        _width = _bbox.width;
        _height = _width;
        _map_width = _width;
        _map_height = _map_width;
        _max_width = 478;
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
        _svg.attr('height', _g.node().getBBox().height + _padding * 1);
    };

    var _draw = function () {
        _create_svg_container();
        _init_maps();
        _draw_municipios();
        _draw_estados();
        _draw_ui();
        _resize_svg();
    };

    var _load_data = function (fn) {
        queue()
            .defer(d3.json, 'data/m.json')
            .defer(d3.csv, 'data/cobertura_cnch.csv')
            .defer(d3.json, 'data/e.json')
            .await(function (error, municipios, cobertura, estados) {
                municipios.objects.m.geometries.forEach(function (m) {
                    cobertura.forEach(function (c) {
                        if (parseInt(m.properties.CVEGEO) == parseInt(c.id_mun)) {
                            m.properties.dif = c.cobertura_programas * 100;
                        }
                    });
                });
                _data_municipios = municipios;
                _data_estados = estados;
                fn();
            });
    };

    var _init_maps = function () {
        _map_projection = d3.geo.mercator()
            .scale(821.329355695949)
            .center([-102.5686847699085, 17.7])
            .translate([_map_width / 2, _map_height / 2]);
        _map_zoom = d3.behavior.zoom().scaleExtent([1, Infinity]).on('zoom', _map_zoomed);
        _map_g = _g.append('g').attr('id', 'map-g');
        _svg.call(_map_zoom);
    };

    var _map_zoomed = function () {
        _map_g_municipios.attr("transform", "translate(" + _map_zoom.translate() + ")scale(" + _map_zoom.scale() + ")")
            .selectAll('path')
            .style("stroke-width", 0.1 / _map_zoom.scale() + "px");
        _map_g_estados.attr("transform", "translate(" + _map_zoom.translate() + ")scale(" + _map_zoom.scale() + ")")
            .selectAll('path')
            .style("stroke-width", 0.75 / _map_zoom.scale() + 'px');
    };

    var _dif_class = function (dif) {
        if (dif >= 0 && dif <= 20) {
            return '0-20';
        } else if (dif > 20 && dif <= 40) {
            return '20-40';
        } else if (dif > 40 && dif <= 60) {
            return '40-60';
        } else if (dif > 60 && dif <= 80) {
            return '60-80';
        } else if (dif > 80 && dif <= 100) {
            return '80-100';
        } else {
            return 'mas-100';
        }
    };

    var _draw_municipios = function () {
        _map_color_scale = d3.scale.linear()
            .domain([0, 25, 50, 75, 100, 101, 1000])
            .range(["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641", "#1998CD", "#8B2F82"]);
        _map_path = d3.geo.path().projection(_map_projection);
        _map_g_municipios = _map_g.append('g').attr('id', 'g-map-municipios');
        _map_g_municipios.selectAll('path')
            .data(topojson.feature(_data_municipios, _data_municipios.objects.m).features)
            .enter()
            .append('path')
            .attr('class', function (d) {
                return 'municipio' + ' cobertura-' + _dif_class(d.properties.dif);
            })
            .attr('d', _map_path)
            .style("fill", function (d) {
                return (typeof _map_color_scale(d.properties.dif) == "string" ? _map_color_scale(d.properties.dif) : "");
            })
            .on('click', _show_municipio_info)
            .on("mouseover", showTooltip)
            .on("mousemove", moveTooltip)
            .on("mouseout", hideTooltip);
    };

    var _show_municipio_info = function (municipio) {
        console.log(municipio.properties);
        d3.select('div#viz-info span.info-entidad').html(municipio.properties.NOM_ENT);
        d3.select('div#viz-info span.info-municipio').html(municipio.properties.NOM_MUN);
        d3.select('div#viz-info span.info-cobertura').html(_fmt_porcentaje(municipio.properties.dif) + '%');
        d3.select('div#viz-info td.cobertura').style("background-color", (typeof _map_color_scale(municipio.properties.dif) == "string" ? _map_color_scale(municipio.properties.dif) : ""));
    };

    var tooltipOffset = {x: 5, y: -25};

    var tooltip = d3.select("body").append("div").attr("class", "tooltip");

    var showTooltip = function (d) {
        moveTooltip();
        var cve_ent = parseInt(d.properties.CVEGEO.substring(0, 2));
        tooltip.style("display", "block")
            .text(d.properties.NOM_MUN + ' (' + _entidad(cve_ent) + ')');
    };

    var moveTooltip = function () {
        tooltip.style("top", (d3.event.pageY + tooltipOffset.y) + "px")
            .style("left", (d3.event.pageX + tooltipOffset.x) + "px");
    };

    var hideTooltip = function () {
        tooltip.style("display", "none");
    };

    var _draw_estados = function () {
        _map_g_estados = _map_g.append('g').attr('id', 'g-map-estados');
        _map_g_estados.selectAll('path')
            .data(topojson.feature(_data_estados, _data_estados.objects.e).features)
            .enter()
            .append('path')
            .attr('class', 'estado')
            .attr('d', _map_path);
    };

    var _draw_ui = function () {
        var offy = _map_g.node().getBBox().height + _padding * 2;
        _ui_g = _g.append('g')
            .attr('id', 'g-ui')
            .attr('transform', 'translate(0, ' + offy + ')');

        var ancho_boton = (_width - _padding * 7) / 6;
        var alto_boton = 30;

        _draw_button(_padding, 0, ancho_boton, alto_boton, '0 to 20%', '0-20');
        _draw_button(ancho_boton + _padding * 2, 0, ancho_boton, alto_boton, '20 to 40%', '20-40');
        _draw_button(ancho_boton * 2 + _padding * 3, 0, ancho_boton, alto_boton, '40 to 60%', '40-60');
        _draw_button(ancho_boton * 3 + _padding * 4, 0, ancho_boton, alto_boton, '60 to 80%', '60-80');
        _draw_button(ancho_boton * 4 + _padding * 5, 0, ancho_boton, alto_boton, '80 to 100%', '80-100');
        _draw_button(ancho_boton * 5 + _padding * 6, 0, ancho_boton, alto_boton, '+ 100%', 'mas-100');

        _draw_button(ancho_boton * 4 + _padding * 5, alto_boton + _padding / 2, ancho_boton * 2 + _padding, alto_boton, 'Center map', null);
        _draw_button_todos();
    };

    var _draw_button = function (x, y, ancho, alto, texto, cobertura) {
        var boton = _ui_g.append('rect')
            .attr('class', 'button cobertura-' + cobertura)
            .attr('x', x)
            .attr('y', y)
            .attr('width', ancho)
            .attr('height', alto)
            .on('click', function () {
                if (cobertura != null) {
                    _button_click(cobertura);
                } else {
                    _centrar_mapa();
                }
            });

        if (cobertura == null) {
            boton.style('fill', '#333');
        }

        _ui_g.append('text')
            .attr('class', 'ui-button-text cobertura-' + cobertura)
            .attr('x', x + ancho / 2)
            .attr('y', y + alto / 2)
            .style('dominant-baseline', 'central')
            .text(texto);
    };

    var _draw_button_todos = function () {
        var ancho_boton = (_width - _padding * 7) / 6;
        var alto_boton = 30;

        var coberturas = ['0-20', '20-40', '40-60', '60-80', '80-100', 'mas-100'];

        _ui_g.append('rect')
            .attr('x', _padding)
            .attr('y', alto_boton + _padding / 2)
            .attr('width', ancho_boton * 2 + _padding)
            .attr('height', alto_boton)
            .style('fill', '#333')
            .on('click', function () {
                coberturas.forEach(function (c) {
                    var button = d3.select('rect.button.cobertura-' + c);
                    if (button.classed('off')) {
                        _button_click(c);
                    }
                });
            });
        _ui_g.append('text')
            .attr('class', 'ui-button-text')
            .attr('x', _padding / 2 + ancho_boton)
            .attr('y', alto_boton + _padding / 2 + alto_boton / 2)
            .style('dominant-baseline', 'central')
            .text('All');

        _ui_g.append('rect')
            .attr('x', _padding * 3 + ancho_boton * 2)
            .attr('y', alto_boton + _padding / 2)
            .attr('width', ancho_boton * 2 + _padding)
            .attr('height', alto_boton)
            .style('fill', '#333')
            .on('click', function () {
                coberturas.forEach(function (c) {
                    var button = d3.select('rect.button.cobertura-' + c);
                    if (!button.classed('off')) {
                        _button_click(c);
                    }
                });
            });
        _ui_g.append('text')
            .attr('class', 'ui-button-text')
            .attr('x', _padding * 3 + _padding / 2 + ancho_boton * 3)
            .attr('y', alto_boton + _padding / 2 + alto_boton / 2)
            .style('dominant-baseline', 'central')
            .text('None');
    };

    var _centrar_mapa = function () {
        _map_zoom.scale(1).translate([0, 0]);
        _map_zoomed();
    };

    var _button_click = function (cobertura) {
        var button = d3.select('rect.button.cobertura-' + cobertura);
        var text = d3.select('text.ui-button-text.cobertura-' + cobertura);
        if (button.classed('off')) {
            button.classed('off', false);
            text.classed('off', false);
            d3.selectAll('path.cobertura-' + cobertura)
                .style("fill", function (d) {
                    return (typeof _map_color_scale(d.properties.dif) == "string" ? _map_color_scale(d.properties.dif) : "");
                })
                .style('pointer-events', 'all');
        } else {
            button.classed('off', true);
            text.classed('off', true);
            d3.selectAll('path.cobertura-' + cobertura)
                .style("fill", '#E2E3E4')
                .style('pointer-events', 'none');
        }
    };

    var _entidad = function (i) {
        var entidades = [
            'AGS', 'BC', 'BCS', 'CAMP', 'COAH', 'COL', 'CHIS', 'CHIH', 'CDMX', 'DGO',
            'GTO', 'GRO', 'HGO', 'JAL', 'MEX', 'MICH', 'MOR', 'NAY', 'NL', 'OAX',
            'PUE', 'QRO', 'QROO', 'SLP', 'SIN', 'SON', 'TAB', 'TAMPS', 'TLAX', 'VER',
            'YUC', 'ZAC'
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
