




var Bouvet= Bouvet||{};
(function(X){

    $(document).ready(function(){
        initMap();
    });

    var initMap= function(){

        var bounds = new OpenLayers.Bounds(
            364928.875, -7256875.5,
            382738.46875, -7243923
        );
        var mapView = new Bouvet.MapView({el:$("#map"), bounds:bounds}).render(layers());

        var personsLayer = new Bouvet.PersonsLayer({"map":mapView.getMap(), "el":$("#persons")});
        personsLayer.setPersons(peoplerepository);
    };

    var MapView = X.MapView = Backbone.View.extend({

        render: function(layers){
            if(this.map){
                this.map.destroy();
            }


            var options = {
               // controls: [],
              projection: new OpenLayers.Projection('EPSG:900913'),
                  maxResolution: 76.4370282852,
                  units: 'm',
                  //numZoomLevels:5,
                  maxExtent: this.options.bounds,
               //
            };


 var mapOptions = {
    projection: new OpenLayers.Projection('EPSG:900913'),
    maxResolution: 76.4370282852,
    units: 'm',
    numZoomLevels: 6,
    maxExtent: new OpenLayers.Bounds(-20037508.3428, -20037508.3428, 20037508.3428,
20037508.3428),
    restrictedExtent: this.options.bounds
    };

            this.map = new OpenLayers.Map(this.el, mapOptions);

            this.map.addControl(new OpenLayers.Control.Navigation());
            this.map.addControl(new OpenLayers.Control.LayerSwitcher());

            this.map.addLayers(layers);
            //this.map.zoomToExtent(,true);

            this.map.setCenter(this.options.bounds.getCenterLonLat(),10);




            return this;
        },

        getMap: function(){
            return this.map;
        }
    });

    var Person =  Backbone.Model.extend({

        getGeometry: function(epsg){

            var fromProjection = new OpenLayers.Projection("EPSG:4326");   // Transform from WGS 1984
            var toProjection   = new OpenLayers.Projection("EPSG:" + epsg);
            var p = new OpenLayers.LonLat(this.get("lon"), this.get("lat"));
            var position = p.transform( fromProjection, toProjection);
            return new OpenLayers.Geometry.Point(position.lon, position.lat);
        },

        getFeature: function(epsg){
            this.feature = new OpenLayers.Feature.Vector(this.getGeometry(epsg), {"name":this.get("name")});
            return this.feature;
        },

        getCoordString: function(){
            function toString(number){
                var abs = Math.abs(number);
                var deg = Math.floor(abs);
                var min = Math.floor(abs*60) % 60;
                var sec = Math.floor(abs*3600) % 60;
                return deg + "\u00B0" + min + '\'' + sec + '\'\'';
            }

            var lon = this.get("lon");
            var lat = this.get("lat");

            var str = toString(lat);
            if(lat >=0){
                str +="N"
            }
            else {
                str +="S"
            }

            str += " " + toString(lon);
            if(lon >=0){
                str +="E"
            }
            else {
                str +="W"
            }

            return str;
        }



    });

    var Persons =  Backbone.Collection.extend({
        model: Person
    });

    var PersonView  = Backbone.View.extend({

        "className":"person_info",

        template: $("#peson_template").html(),

        initialize: function(){
            _.bindAll(this,"toggle");
            this.model.on("create", this.render);
            this.model.on("change:selected", this.toggle);
        },

        render: function(){

            var data = {
                "coord": this.model.getCoordString(),
                "name": this.model.get("name"),
                "region": this.model.get("region")
            };

            this.$el.html(_.template(this.template, data));
            this.options.parent.$el.append(this.$el);
            return this;
        },

        toggle: function(){
            var selected = this.model.get("selected");
            if(selected){
                this.render();
            }
            else {
                this.remove();
            }
        }

    });

    var PersonsLayer = Bouvet.PersonsLayer = Backbone.View.extend({

        events: {
            "click #show": "showAll",
            "click .pers": "showPers"
        } ,

        initialize: function(){

            this.persons = new Persons();
            this.persons.bind("reset",this.addAll,this);
            this.layer = new OpenLayers.Layer.Vector("test", {styleMap:personstyle,displayInLayerSwitcher:false});
            this.options.map.addLayer(this.layer);
            _.bindAll(this,"addOne", "featureSelected", "featureUnSelected","showAll","showPers");
            this.selectControl = new OpenLayers.Control.SelectFeature(this.layer, {
                                                                                    clickout: true, toggle: false,
                                                                                    multiple: false, hover: false
                                                                                 });
            this.options.map.addControl(this.selectControl);
            this.selectControl.activate();
            this.layer.events.register("featureselected", this, this.featureSelected);
            this.layer.events.register("featureunselected", this, this.featureUnSelected);

            this.epsg = 900913;
        },

        showAll: function(){
            this.$el.find(".person_info").remove();
            this.$el.find(".pers").remove();
            this.persons.each(function(person){
                this.$el.append($("<div class='pers'>"+person.get("name")+"</div>"));
            },this);
        },

        showPers: function(e){
            console.log(e);
        },

        setPersons: function(personsData){
            this.persons.reset(personsData);
        },

        addAll: function() {
              this.persons.each(this.addOne);
        },

        addOne: function(person){
            var personView = new PersonView({model:person, parent:this});
            this.layer.addFeatures([person.getFeature(this.epsg)]);
        },

        featureSelected: function(e){

            var id= e.feature.id;
            this.persons.find(function(person){return person.feature.id == id}).set({"selected": true})
        },

        featureUnSelected: function(e){
            var id= e.feature.id;
            var feature = this.persons.find(function(person){return person.feature.id == id}).set({"selected": false});
        }

    });

    var personstyle = new OpenLayers.StyleMap({
        "default": {
            "externalGraphic": "gfx/pingo.png",
            "graphicWidth": 32,
            "graphicHeight": 32,
        },
         "select": {
            "externalGraphic": "gfx/pingo_selected.png",
            "graphicWidth": 32,
            "graphicHeight": 32,
        }

    });


    var layers = function(){
        var background = new OpenLayers.Layer.WMS(
            "Bouvet Vector", "http://localhost:8080/geoserver/bouvet/wms",
            {
                LAYERS: 'bouvet:island_osm',
                STYLES: '',
                format: "image/png",
                BGCOLOR:"#E3FFFF"
            },
            {
                singleTile: true,
                ratio: 1,
                isBaseLayer: true,
                yx : {'EPSG:900913': false}
            }
        );


        var tiles =  new OpenLayers.Layer.TMS('TMS bouvet', 'http://www.mineturer.org/mapproxy/tms/',
            {layername: 'bouvetisland_new_EPSG900913', type: 'png',
            tileSize: new OpenLayers.Size(256, 256),
            zoomOffset: 10
        });



        var gsat = new OpenLayers.Layer.Google(
            "Google Satellite",
            {type: google.maps.MapTypeId.SATELLITE, numZoomLevels: 22}
        );

        var names = new OpenLayers.Layer.WMS(
            "Names", "http://localhost:8080/geoserver/bouvet/wms",
            {
                LAYERS: 'bouvet:names_p',
                STYLES: '',
                format: "image/png",
                transparent:true
            },
            {
                singleTile: true,
                ratio: 1,
                isBaseLayer: false,
                yx : {'EPSG:900913': false}
            }
        );

/*
        var style = {
            "label":"HC SVNT DRACONES",
            "fontSize":10
        }
        */
        //var dragon = new OpenLayers.Layer.Vector("dragon",{displayInLayerSwitcher:false,style:style});

        //var feature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.Point(337038,-7277023));
        //dragon.addFeatures([feature])


        return [tiles,gsat];
    }

}(Bouvet));

