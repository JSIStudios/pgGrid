/* =============================================================
 * pgGrid.js v0.1.0
 * https://github.com/JSIStudios/pgGrid
 * =============================================================
 * Copyright 2014 JSI Studios, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function ($) {

    "use strict"; // jshint ;_;


    /* pgGrid class definition
     * ================================= */

    var PGGrid = function (element, options) {
        var that = this;
        this.$element = $(element);

        // initialize and aggregate options
        this.options = $.extend({}, $.fn.pgGrid.defaults, options);

        // initialize methods and properties from options
        this.item = this.options.item;
        this.currentPage = this.options.initialPage;
        this.pageSize = this.options.pageSize;
        this.showPageSizeSelector = this.options.showPageSizeSelector;
        this.getData = this.options.getData || this.getData;
        this.process = this.options.process || this.process;
        this.render = this.options.render || this.render;
        this.setFooter = this.options.setFooter || this.setFooter;
        this.dataModel = this.options.dataModel;
        this.childRowProperty = this.options.childRowProperty;
        this.expandedRowIds = new Array();

        // initialize objects
        this.$grid = $(this.options.grid);
        this.$grid.addClass(this.options.gridClass);
        this.$title = $(this.options.title);
        this.$initLoader = $(this.options.initLoader);
        this.$header = this.$grid.find('thead');
        this.$body = this.$grid.find('tbody');
        this.$footer = this.$grid.find('tfoot');
        this.$footerRow = this.$footer.find('td:first').attr('colspan', this.dataModel.length);
        this.$footerContainer = $('<div class="pull-left"></div>');
        this.$refreshBtn = $(this.options.refreshBtn).on('click', function(){that.refresh()});
        this.$loader = $(this.options.loader);
        this.$startBtn = $('<i class="icon-fast-backward icon-disabled"></i>');
        this.$backBtn  = $('<i class="icon-backward icon-disabled"></i>');
        this.$nextBtn = $('<i class="icon-forward icon-disabled"></i>');
        this.$endBtn  = $('<i class="icon-fast-forward icon-disabled"></i>');
        this.$pageCountText = $('<span>1</span>');
        this.$pageSelector = $('<select class="page-size-selector"></select>');
        this.$pageSizeSelector = $('<select class="page-size-selector"></select>');


        // bind title, table and initLoader
        this.$element.append(this.$title);
        this.$element.append(this.$initLoader);
        this.$initLoader.show();


        this.buildHeader();
        this.buildFooter();

        // load data
        this.getPage(this.currentPage);
        this.$element.append(this.$grid);
        this.$initLoader.hide();
        this.$loader.hide();
    };

    PGGrid.prototype = {
        constructor: PGGrid,
        show: function() {
            this.$grid.show();
            return this;
        },
        hide: function() {
            this.$grid.hide();
            return this;
        },
        getData: function(page, pageSize, process) { return this; },
        process: function(data) {
            if (!data.items.length) {
                return this.hide();
            }

            return this.render(data).show();
        },
        render: function(data) {
            this.buildBody(data);
            this.setFooter(data);
            return this;
        },
        buildBody: function(data){
            this.$body.empty();

            for(var i in data.items){
                this.buildRow(data.items[i], 0);
            }
        },
        buildRow: function(item, childLevel, parentId){
            var that = this;
            var id = item.id;

            var row = $("<tr></tr>")
                .attr('data-value', item)
                .attr('id', item.id)
                .on('mouseEnter', 'tbody tr', $.proxy(this.mouseEnter, this))
                .on('mouseLeave', 'tbody tr', $.proxy(this.mouseLeave, this));


            if(childLevel > 0) {
                if($.inArray(parentId, this.expandedRowIds) < 0)
                    row.hide();
                row.attr('data-parent-id', parentId);
            }

            this.buildCols(item, row, childLevel);
            this.$body.append(row);

            if(item.hasOwnProperty(this.childRowProperty)){
                var expander = $('<i class="'+ ($.inArray(id, this.expandedRowIds) >= 0 ? 'icon-chevron-down' : 'icon-chevron-right') + ' icon-active"></i>')
                    .on('click', function(){ that.toggleChildren($(this), id); });
                row.find('td:first').prepend(expander);

                for(var i in item[this.childRowProperty]){
                    this.buildRow(item[this.childRowProperty][i], childLevel + 1, id);
                }
            }
        },
        buildCols: function(item, row, childLevel){
            for(var i in this.dataModel){
                var model = this.dataModel[i];
                var col = $('<td></td>').css('padding-left', (16 * childLevel));
                var val = item[model.index];
                if(typeof model.formatter !== 'undefined')
                    val = model.formatter(val);
                col.append(val);
                row.append(col);
            }
        },
        buildHeader: function(){
            var headerRow = this.$header.find('tr:first');
            headerRow.empty();

            for(var i in this.dataModel){
                headerRow.append($('<td></td>').html(this.dataModel[i].name));
            }
        },
        buildFooter: function(){
            var that = this;
            this.$pageSelector.on('change', function(){that.changePage(that.$pageSelector.val())});
            var $pagerDetails = $('<span>Page&nbsp;</span>')
                .append(this.$pageSelector)
                .append('&nbsp;of&nbsp;')
                .append(this.$pageCountText);

            this.$footerContainer.append(this.$startBtn);
            this.$footerContainer.append(this.$backBtn);
            this.$footerContainer.append($pagerDetails);
            this.$footerContainer.append(this.$nextBtn);
            this.$footerContainer.append(this.$endBtn);
            this.$footerContainer.append(this.$refreshBtn);
            this.$footerContainer.append(this.$loader);

            this.$pageSizeSelector.on('change', function(){that.changePageSize(that.$pageSizeSelector.val())});
            if(this.options.showPageSizeSelector){
                var selectorContainer = $('<span class="page-size-selector-container"></span>');
                selectorContainer.append($('<span>Page Size: </span>'));
                for(var i in this.options.pageSizes){
                    var pageSize = this.options.pageSizes[i];
                    this.$pageSizeSelector.append($('<option></option>').attr('value', pageSize.value).text(pageSize.text));
                }
                selectorContainer.append(this.$pageSizeSelector);
                this.$footerContainer.append(selectorContainer);
            }
            this.$footerRow.append(this.$footerContainer);
        },
        setFooter: function(data) {
            var totalPages = Math.ceil(data.total / this.pageSize);
            this.$pageSelector.text(this.currentPage);
            this.$pageCountText.text(totalPages);

            this.$startBtn.off();
            this.$backBtn.off();
            this.$nextBtn.off();
            this.$endBtn.off();

            var that = this;
            if(this.currentPage > 1){
                this.$startBtn.removeClass('icon-disabled')
                    .addClass('icon-active')
                    .on('click', function(){ that.getPage(1); });

                this.$backBtn.removeClass('icon-disabled')
                    .addClass('icon-active')
                    .on('click', function(){ that.prevPage(); });
            }
            else{
                this.$startBtn.addClass('icon-disabled')
                    .removeClass('icon-active');

                this.$backBtn.addClass('icon-disabled')
                    .removeClass('icon-active');
            }

            if(this.currentPage < totalPages){
                this.$endBtn.removeClass('icon-disabled')
                    .addClass('icon-active')
                    .on('click', function(){ that.getPage(totalPages); });

                this.$nextBtn.removeClass('icon-disabled')
                    .addClass('icon-active')
                    .on('click', function(){ that.nextPage(); });
            }
            else{
                this.$endBtn.addClass('icon-disabled')
                    .removeClass('icon-active');

                this.$nextBtn.addClass('icon-disabled')
                    .removeClass('icon-active');
            }

            for(var i = 1; i <= totalPages; i++){
                var option = $('<option></option>').attr('value', i).text(i);
                if(i == this.currentPage)
                    option.attr('selected', 'selected');

                this.$pageSelector.append(option);
            }
        },
        nextPage: function() {
            this.getPage(this.currentPage + 1);
        },
        prevPage: function() {
            this.getPage(this.currentPage - 1);
        },
        refresh: function() {
            this.showLoader();
            this.getPage(this.currentPage);
            this.getPage(this.currentPage);
            this.hideLoader();
        },
        getPage: function(page){
            this.currentPage = page;
            //this.showLoader();
            this.getData(page, this.pageSize, $.proxy(this.process, this));
            //this.hideLoader();
        },
        changePage: function(page) {
            this.currentPage = page;
            this.refresh();
        },
        changePageSize: function(pageSize) {
            this.pageSize = pageSize;
            this.currentPage = 1;
            this.refresh();
        },
        mouseEnter: function(e) {
            this.mousedover = true;
            $(e.currentTarget).addClass('active');
        },
        mouseLeave: function(e) {
            this.mousedover = false;
            $(e.currentTarget).removeClass('active');
        },
        showLoader: function(){
            this.$refreshBtn.hide();
            this.$loader.show();
        },
        hideLoader: function(){
            this.$refreshBtn.show();
            this.$loader.hide();
        },
        toggleChildren: function(obj, parentId){
            var isCurrentlyExpanded = obj.hasClass('icon-chevron-down');

            if(!isCurrentlyExpanded){
                obj.removeClass('icon-chevron-right')
                    .addClass('icon-chevron-down');

                this.showChildRows(parentId);
                this.expandedRowIds.push(parentId);
            }
            else{
                obj.removeClass('icon-chevron-down')
                    .addClass('icon-chevron-right');

                this.hideChildRows(parentId);
                this.expandedRowIds.pop(parentId);
            }
        },
        showChildRows: function(parentId){
            var childRows = this.$body.find('tr[data-parent-id=' + parentId + ']');
            childRows.each(function(index, el){$(el).show()});
        },
        hideChildRows: function(parentId){
            var childRows = this.$body.find('tr[data-parent-id=' + parentId + ']');
            childRows.each(function(index, el){$(el).hide()});
        }
    };


    /* pgGrid Plugin Definition
     * =========================== */

    var old = $.fn.pggrid;

    $.fn.pgGrid = function(option) {
        return this.each(function() {
            var $this = $(this),
                data = $this.data('pggrid'),
                options = typeof option == 'object' && option;
            if (!data) $this.data('pggrid', (data = new PGGrid(this, options)));
            if (typeof option == 'string') data[option]();
        });
    };

    $.fn.pgGrid.defaults = {
        grid: '<table class="pgGrid"><thead><tr></tr></thead><tbody></tbody><tfoot><tr><td></td></tr></tfoot></table>',
        gridClass: "table table-condensed table-bordered table-striped table-form",
        item: '<tr></tr>',
        initialPage: 1,
        pageSize: 10,
        showPageSizeSelector: true,
        pageSizes: [{text:"10", value: 10}, {text:"20", value: 20}, {text:"30", value: 30}, {text:"All", value: -1}],
        dataModel: [
            { name: 'Id', index: 'id'},
            { name: 'Value', index: 'value', formatter: function(val){ return '**' + val + '**'}}
        ],
        title: '<h4>Data</h4>',
        initLoader: '<div><i class="icon-refresh icon-spin"></i> Loading data...</div>',
        refreshBtn: '<i class="icon-refresh icon-active"></i>',
        loader: '<i class="icon-refresh icon-spin"></i>',
        childRowProperty: 'children'
    };

    $.fn.pgGrid.Constructor = PGGrid;

}(window.jQuery);