describe("Ext.view.MultiSelector", function(){
    var Employee,
        panel,
        multiSelector,
        synchronousLoad = true,
        proxyStoreLoad = Ext.data.ProxyStore.prototype.load,
        loadStore;

    var firstNames = ['Ben', 'Don', 'Evan', 'Kevin', 'Nige', 'Phil', 'Ross', 'Ryan'],
        lastNames = ['Toll', 'Griffin', 'Trimboli', 'Krohe', 'White', 'Guerrant', 'Gerbasi', 'Smith'],
        data = [],
        rand = 37,
        map, i, j, k, s,
        sequence = 0;

    var defaultStoreCfg = {
        model: 'spec.Employee',
        proxy: {
            type: 'ajax',
            url: 'foo'
        }
    };

    var defaultSearchStoreCfg = {
        model: 'spec.Employee',
        autoLoad: true,
        proxy: {
            type: 'ajax',
            url: 'bar'
        }
    };

    for (i = 0; i < lastNames.length; ++i) {
        map = {};
        data.push({
            id: ++sequence,
            forename: (s = firstNames[i]),
            surname: lastNames[i]
        });
        map[s] = 1;

        for (j = 0; j < 3; ++j) {
            do {
                k = rand % firstNames.length;
                rand = rand * 1664525 + 1013904223; // basic LCG but repeatable
                rand &= 0x7FFFFFFF;
            } while (map[s = firstNames[k]]);

            map[s] = 1;
            data.push({
                id: ++sequence,
                forename: s,
                surname: lastNames[i]
            });
        }
    }

    function makePanel(storeCfg, searchStoreCfg) {
        var storeCfg = storeCfg || defaultStoreCfg,
            searchStoreCfg = searchStoreCfg || defaultSearchStoreCfg;

        panel = new Ext.panel.Panel({
            renderTo: document.body,
            width: 400,
            height: 300,
            layout: 'fit',

            items: [{
                xtype: 'multiselector',
                title: 'Selected Employees',
                store: storeCfg,
                fieldName: 'name',

                viewConfig: {
                   deferEmptyText: false,
                   emptyText: 'No employees selected'
                },

                search: {
                    field: 'name',
                    store: searchStoreCfg
                }
            }]
        });

        multiSelector = panel.child('multiselector'); 
    }

    function completeRequest(responseData, status) {
        var responseText = Ext.encode(responseData || data);

        Ext.Ajax.mockComplete({
            status: status || 200,
            responseText: responseText
        });
    }

    beforeEach(function() {
        Employee = Ext.define('spec.Employee', {
            extend: 'Ext.data.Model',
            fields: [{
                name: 'id'
            }, {
                name: 'forename'
            }, {
                name: 'surname'
            }, {
                name: 'name',
                convert: function(v, rec) {
                    return rec.editing ? v : rec.get('forename') + ' ' + rec.get('surname');
                }
            }]
        });
    });

    afterEach(function() {
        Ext.undefine('spec.Employee');
        Ext.data.Model.schema.clear();
        panel.destroy();
    });

    describe("search popup", function () {
        describe("synchronizing selection", function () {
            describe("store with remote data", function () {
                beforeEach(function() {
                    // Override so that we can control asynchronous loading
                    loadStore = Ext.data.ProxyStore.prototype.load = function() {
                        proxyStoreLoad.apply(this, arguments);
                        if (synchronousLoad) {
                            this.flushLoad.apply(this, arguments);
                        }
                        return this;
                    };

                    MockAjaxManager.addMethods();

                    makePanel();
                });

                afterEach(function() {
                    // Undo the overrides.
                    Ext.data.ProxyStore.prototype.load = proxyStoreLoad;
                    MockAjaxManager.removeMethods();
                });

                it("should select the records in the searcher which match by ID the records in the selector", function() {
                    var searchStore,
                        searchGrid;

                    // Load the multiSelector's store
                    multiSelector.store.load();
                    completeRequest(data[0]);

                    multiSelector.onShowSearch();

                    // Search grid's store is set to autoload, so wait for it to kick off a load
                    waitsFor(function() {
                        searchGrid = multiSelector.searchPopup.child('gridpanel');
                        searchStore = searchGrid.store;

                        return (searchStore instanceof Ext.data.Store) && searchStore.isLoading();
                    }, 'searchStore to kick off a load');                    
                    runs(function() {
                        completeRequest();
                        
                        expect(searchGrid.getSelectionModel().getSelection()[0].get('name')).toBe(multiSelector.store.getAt(0).get('name'));
                    });
                });

                it("should visually highlight the rows in the searcher which match by ID the records in the selector", function () {
                    var searchStore,
                        searchGrid,
                        nodes;

                    // Load the multiSelector's store
                    multiSelector.store.load();
                    completeRequest(data[0]);

                    multiSelector.onShowSearch();

                    // Search grid's store is set to autoload, so wait for it to kick off a load
                    waitsFor(function() {
                        searchGrid = multiSelector.searchPopup.child('gridpanel');
                        searchStore = searchGrid.store;

                        return (searchStore instanceof Ext.data.Store) && searchStore.isLoading();
                    }, 'searchStore to kick off a load');                    
                    runs(function() {
                        completeRequest();

                        nodes = multiSelector.down('gridpanel').getView().getSelectedNodes();
                        expect(nodes[0]).toHaveCls('x-grid-item-selected');
                    });
                });
            });

            describe("store with inline data", function () {
                beforeEach(function () {
                    var storeCfg = {
                        model: 'spec.Employee',
                        data: [{
                            forename: 'Ben',
                            surname: 'Toll',
                            id: 1
                        }]
                    };

                    var searchStoreCfg = {
                        model: 'spec.Employee',
                        remoteSort: false,
                        remoteFilter: false,
                        autoLoad: false,
                        data: [{
                            forename: 'Ben',
                            surname: 'Toll',
                            id: 1
                        },{
                            forename: 'Don',
                            surname: 'Griffin',
                            id: 2
                        },{
                            forename: 'Evan',
                            surname: 'Trimboli',
                            id: 3
                        }]
                    };
                    
                    makePanel(storeCfg, searchStoreCfg);
                });
                it("should select the records in the searcher which match by ID the records in the selector", function () {
                    multiSelector.onShowSearch();
                    
                    expect(multiSelector.down('gridpanel').selModel.getSelection()[0].get('name')).toBe(multiSelector.store.getAt(0).get('name'));
                });

                it("should visually highlight the rows in the searcher which match by ID the records in the selector", function () {
                    var nodes;

                    multiSelector.onShowSearch();

                    nodes = multiSelector.down('gridpanel').getView().getSelectedNodes();
                    expect(nodes[0]).toHaveCls('x-grid-item-selected');
                });
            });
        });

        describe("synchronizing deselection", function () {
            beforeEach(function () {
                var storeCfg = {
                    model: 'spec.Employee',
                    data: [{
                        forename: 'Ben',
                        surname: 'Toll',
                        id: 1
                    }]
                };

                var searchStoreCfg = {
                    model: 'spec.Employee',
                    remoteSort: false,
                    remoteFilter: false,
                    autoLoad: false,
                    data: [{
                        forename: 'Ben',
                        surname: 'Toll',
                        id: 1
                    },{
                        forename: 'Don',
                        surname: 'Griffin',
                        id: 2
                    },{
                        forename: 'Evan',
                        surname: 'Trimboli',
                        id: 3
                    }]
                };
                
                makePanel(storeCfg, searchStoreCfg);
            });

            it("should deselect the records in the searcher which match by ID the records removed from the selector", function () {
                var store = multiSelector.getStore(),
                    record;

                multiSelector.onShowSearch();

                record = store.getAt(0);
                store.remove(record);

                multiSelector.searchPopup.deselectRecords(record);

                expect(multiSelector.down('gridpanel').selModel.getSelection().length).toBe(0);
            });

            it("should visually unhighlight the rows in the searcher which match by ID the records removed from the selector", function () {
                var store = multiSelector.getStore(),
                    record;

                multiSelector.onShowSearch();

                record = store.getAt(0);
                store.remove(record);

                multiSelector.searchPopup.deselectRecords(record);

                node = multiSelector.down('gridpanel').getView().getNode(0);

                expect(node).not.toHaveCls('x-grid-item-selected');
            });
        });
    });
});