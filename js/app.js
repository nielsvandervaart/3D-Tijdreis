// Sample Application with ArcGIS API for JavaScript 4.13
// Settlement development of the city of Zurich in 3D dynamically animated over time
// Author: Lisa Staehli customized by Oscar Stoop & Niels van der Vaart
// Date: January 2020
// Original Repo: https://github.com/lisastaehli/zurich-time-travel

define([
    "esri/core/declare",

    "esri/Map",
    "esri/views/SceneView",
    "esri/layers/SceneLayer",
    "esri/layers/FeatureLayer",

    "esri/renderers/SimpleRenderer",
    "esri/symbols/MeshSymbol3D",
    "esri/symbols/FillSymbol3DLayer",

    "esri/widgets/Legend",

    "dojo/dom",
    "dojo/on",
    "dojo/dom-style",
], function (
    declare,
    Map, SceneView, SceneLayer, FeatureLayer,
    SimpleRenderer,
    MeshSymbol3D, FillSymbol3DLayer, Legend,
    dom, on, domStyle) {


    return declare(null, {

        constructor: function () {

        },

        init: function () {

            // Open Data Zurich
            // 3D Buildings, construction year of buildings & water bodies
            // All can be downloaded in the GIS Browser: https://maps.zh.ch/

            this.serviceURL = "https://tiles.arcgis.com/tiles/nSZVuSZjHpEZZbRo/arcgis/rest/services/BAG_3D_WGS/SceneServer"; // 3D buildings with construction year
            this.yearAttribute = "bouwjaar";

            // load a new web scene
            var scene = new Map({
                basemap: "topo",
                ground: "world-elevation"
            });

            // create a view
            var view = new SceneView({
                container: "viewDiv",
                map: scene,
                qualityProfile: "high"
            });

            // environment settings for better visuals (shadows)
            view.environment.lighting.ambientOcclusionEnabled = true;
            view.environment.lighting.directShadowsEnabled = true;

            window.view = view; // for debugging only


            // renderer for already built buildings
            var rendererYearSL = new SimpleRenderer({
                symbol: new MeshSymbol3D({
                    symbolLayers: [new FillSymbol3DLayer({
                        material: { color: "white",
                                    colorMixMode: "replace" },
                        edges: {
                            type: "solid",
                            color: [0, 0, 0, 0.6],
                            size: 1}
                    })]
                
            }),
            visualVariables: [
              {
                // specifies a visual variable of continuous color
                type: "color",
                // based on a field indicating the walking time to public transport
                field: "bouwjaar",
                legendOptions: {
                  title: "Bouwjaar"
                },
                // color ramp from white to blue
                // based on the walking time to public transport.
                // Buildings will be assigned a color proportional to the
                // min and max colors specified below.
                stops: [
                  {
                    value: 1800,
                    color: "#2887a1",
                    label: "1800"
                  },
                  {
                    value: 2020,
                    color: "#f8fcfd",
                    label: "2020"
                  }
                ]
              }
            ]
          })

            // renderer for buildings built at year x
            var rendererYearSL2 = new SimpleRenderer({
                symbol: new MeshSymbol3D({
                    symbolLayers: [new FillSymbol3DLayer({
                        material: { color: "#ffffff" },
                        edges: {
                            type: "sketch",
                            color: [0, 0, 0, 0.8],
                            size: 2.5}
                    })]
                })
            })

            // create a scene layer with all other buildings (92%)
            this.buildingsLayer = this.createSceneLayer(
                this.serviceURL,
                1, rendererYearSL, true
            )
            scene.add(this.buildingsLayer);

            // create a second scene layer with all other buildings that is shown with the buildings of the selected year
            this.buildingsLayer2 = this.createSceneLayer(
                this.serviceURL,
                1, rendererYearSL2, true
            )
            scene.add(this.buildingsLayer2);

            // add water bodies with water renderer
            var waterBodies = new FeatureLayer({
                url: 'https://basisregistraties.arcgisonline.nl/arcgis/rest/services/BRT/BRT_TOP10NL/FeatureServer/120', // water bodies
                elevationInfo: {
                    mode: 'on-the-ground',
                },
                renderer: {
                    type: "simple",
                    symbol: {
                        type: "polygon-3d",
                        symbolLayers: [
                            {
                                type: "water",
                                waveDirection: 260,
                                color: "#2887a1",
                                waveStrength: "moderate",
                                waterbodySize: "medium"
                            }
                        ]
                    }
                }
            });

            scene.add(waterBodies);

            // wait until view is loaded
            view.when(function () {

                // add legend
                var legend = new Legend({
                    view: view,
                    layerInfos: [{
                        layer: this.buildingsLayer,
                        title: "Bestaande gebouwen"
                    }, {
                        layer: this.buildingsLayer2,
                        title: "Gebouw in aanbouw"
                    }]
                });

                view.ui.add(legend, "bottom-right");

                // add timeline slider (noUISlider: https://refreshless.com/nouislider/)
                var softSlider = document.getElementById('soft');

                noUiSlider.create(softSlider, {
                    start: 1900,
                    connect: "lower",
                    range: {
                        min: 1800,
                        max: 2020
                    },
                    pips: {
                        mode: 'values',
                        values: [1800, 1900, 1920, 1940, 1960, 1980, 2000, 2020],
                        density: 50
                    },
                    format: wNumb({
                        decimals: 0
                    })
                });

                // trigger timeline animation for first year
                this.timelineAnimation(1900);

                // start timeline animation when user interacts with slider
                softSlider.noUiSlider.on('update', function (values, handle) {
                    this.timelineAnimation(parseInt(values[0]));
                }.bind(this));

                // zoom to Zurich
                // TODO: zoom to another location (retrieve view.camera from console in web browser)
                view.goTo({
                    "position": {
                        "x": 519883,
                        "y": 6760000,
                        "z": 2000,
                        "spatialReference": {
                            "latestWkid": 3857,
                            "wkid": 102100
                        }
                    },
                    "heading": 0,
                    "tilt": 60
                }, {
                    speedFactor: 5, // animation is 5 times slower than default
                    easing: "linear" // easing function to slow down when reaching the target
                }
                );

                // timeline animation
                var buttonPlay = dom.byId("button-play");
                var buttonStop = dom.byId("button-stop");

                // start animation
                on(buttonPlay, "click", function () {
                    // change UI of button
                    domStyle.set(buttonPlay, "display", "none");
                    domStyle.set(buttonStop, "display", "inline-block");

                    var year = this.currentYear + 1;

                    this.timelineInterval = setInterval(function () {
                        // cancel Interval
                        softSlider.noUiSlider.set(year);
                        this.timelineAnimation(year); // trigger timeline animation
                        year += 1; // increase year
                        if (year === 2020) { year = 1800; } // make loop
                    }.bind(this), 1000);

                }.bind(this));

                // stop animation
                on(buttonStop, "click", function () {
                    // change UI of button
                    domStyle.set(buttonPlay, "display", "inline-block");
                    domStyle.set(buttonStop, "display", "none");

                    clearInterval(this.timelineInterval);

                }.bind(this));


            }.bind(this)).otherwise(function (err) {
                console.error(err);
            });

        },

        timelineAnimation: function (year) {
            // animate buildings (show, color) based on current year on timeline
            this.currentYear = year;

            // change displayed year in the UI
            dom.byId("timeline-count").innerHTML = year;

            // define conditions for buildings based on selected year

            this.buildingsLayer.definitionExpression = this.yearAttribute + " IS NOT null AND " + this.yearAttribute + " > 0 AND " + this.yearAttribute + " < " + year + ""; // buildings that are already built in that year
            this.buildingsLayer2.definitionExpression = this.yearAttribute + " IS NOT null AND " + this.yearAttribute + " > 0 AND " + this.yearAttribute + " = " + year + ""; // buildings that have just been built in that year


        },

        createSceneLayer: function (url, opacity, renderer, visible) {
            // construct a scene layer based an input parameters
            return new SceneLayer({
                url: url,
                opacity: opacity,
                renderer: renderer,
                visible: visible,
                popupEnabled: false
            })
        }
    });
});
