var Vis = (function () {

    var _container_id;
    var _container;
    var _bbox;
    var _width;
    var _height;
    var _padding;
    var _max_width;
    var _svg;
    var _g;
    var _data;

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

        this.render();
    }

    /*
     Util methods
     */

    var _scale = function (value) {
        return value * _width / _max_width;
    };

    /*
     Private methods
     */

    var _draw_personaje = function (idx) {
        var personaje = _data[idx];
        var contenedor_discursos = d3.select('div#discurso');
        d3.select('div#discurso')
            .transition()
            .duration(300)
            .style('opacity', 0)
            .each("end", function () {
                contenedor_discursos.html('');

                personaje.discursos.forEach(function (d) {
                    var dicho = contenedor_discursos.append('div')
                        .attr('class', 'dicho');
                    dicho.append('h6').html('Speech');
                    dicho.append('p').html('"' + d.dicho + '"');
                    dicho.append('p')
                        .attr('class', 'fecha-fuente')
                        .html(d.fecha + ' - ' + d.fuente);

                    var hecho = contenedor_discursos.append('div')
                        .attr('class', 'hecho');
                    hecho.append('h6').html('Fact');
                    hecho.append('p').html(d.hecho);
                });

                d3.select('div#discurso')
                    .transition()
                    .duration(300)
                    .style('opacity', 1);
            });
    };

    var _draw = function () {
        _draw_personaje(0);
    };

    var _load_data = function (fn) {
        d3.json('data/discursos.json', function (error, data) {
            if (error) console.log(error);
            _data = data;
            fn();
        });
    };

    /*
     Public methods
     */

    Vis.prototype = {
        render: function () {
            // _delete_vis();
            _load_data(_draw);
        },
        select_personaje: function (idx) {
            d3.selectAll('img.personaje').classed('selected', false);
            d3.select('img.personaje-' + idx).classed('selected', true);
            _draw_personaje(idx);
        }
    };

    return Vis;

})();

var vis = new Vis('vis');
