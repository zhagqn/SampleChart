/***************************************************************************
* jQuery SampleChart 1.0.0
* Copyright 2016 BocoDss
* Depends:
*      jquery.ui.core.js
*      Echarts
****************************************************************************/
(function ($) {
    //入口
    $.fn.SampleChart = function (options) {
        //属性虽然是index，但是实际是string类型，防止有人误传为数字
        var This = $(this);
        if ((options.DataSource != undefined && typeof options.DataSource == 'object') || (options.ChartType == 'gauge' && !isNullProperty(options.GaugeValue))) {
            BindChart(options, This);
        }
        else {
            var url = getRootPath() + "/javascript/JSControl/SampleChart/Handler/jqEchart.ashx";
            if (options.Url && typeof options.Url == 'string' && options.Url.length > 0) {
                url = options.Url;
            }
            dss.load(true);
            var by = $(document.body).data("closeData");
            $.ajax({
                url: url,
                data: {
                    strAnalyzer: dss.jsonToString(options.analyzer),
                    timekey: (by ? by.key : "")
                },
                type: 'post',
                success: function (data) {
                    var result = data.split("[￥]");
                    by = $(document.body).data("closeData");
                    if (by && by.key) {
                        if (result.length == 4 && result[0] == "1" && by.key == result[3]) {
                            options.DataSource = eval('(' + result[1] + ')');
                            options.analyzer = eval('(' + result[2] + ')');
                            BindChart(options, This);
                        }
                        else {
                            alert(data);
                        }
                    }
                    dss.load(false);
                }
            });
        }

    }
    function BindChart(options, This) {
        if (isNullProperty(options.XDataColIndex) == false) {
            options.XDataColIndex = options.XDataColIndex.toString();
        }
        if (isNullProperty(options.YDataColIndex) == false) {
            options.YDataColIndex = options.YDataColIndex.toString();
        }
        if (isNullProperty(options.Y2DataColIndex) == false) {
            options.Y2DataColIndex = options.Y2DataColIndex.toString();
        }

        //统一属性，设置宽高等
        options = $.extend(defaultOptions(), options);

        //仪表盘未指定YDataColIndex时，将DataSource置空
        if (options.ChartType == "gauge" && isNullProperty(options.YDataColIndex)) {
            options.DataSource = $.extend(true, options.DataSource, {
                colnames: [],
                rows: []
            });
        }
        //==============处理下载============== begin
        var downDataSource = {
            sql: null,
            conn: null,
            source: null,
            analyzer: null,
            titleName: "",
            SampleChartOption: {
                ChartType: options.ChartType,
                XDataColIndex: options.XDataColIndex,
                XDataColName: options.XDataColName,
                YDataColIndex: options.YDataColIndex,
                YDataColName: options.YDataColName,
                Y2DataColIndex: options.Y2DataColIndex,
                Y2DataColName: options.Y2DataColName,
                SubChartType: options.SubChartType == "" ? [] : options.SubChartType
            }
        };
        var optionNew = $.extend(true, {}, options); ///复制options，防止原来的options改变后影响
        downDataSource.source = { colnames: optionNew.DataSource.colnames, rows: optionNew.DataSource.rows };
        downDataSource.titleName = options.captionName;
        This.data("downDataSource", downDataSource);
        This.data("downDataType", "down");
        options["DomID"] = This[0].id; //增加参数为了给外面追踪
        //==============处理下载============== end

        options.DivWidth = This[0].offsetWidth;//当前div的高度
        options.DivHeight = This[0].offsetHeight;//当前div的高度

        //$("#" + This[0].id).css("width", This[0].offsetWidth);
        //$("#" + This[0].id).css("height", This[0].offsetHeight);

        //为兼容以前的FusionCharts中div未指定宽度和高度，则用Width、和Height属性
        if (isNullProperty(This[0].offsetWidth) || parseInt(This[0].offsetWidth) < 3) {
            $("#" + This[0].id).css("width", options.Width);
        }
        if (isNullProperty(This[0].offsetHeight) || parseInt(This[0].offsetHeight) < 3) {
            $("#" + This[0].id).css("height", options.Height);
        }
        options["targetid"] = This[0].id;
        if ((isNullProperty(options.DataSource) || options.DataSource.rows.length <= 0) && (options.ChartType != "gauge" || options.GaugeName == "") && (options.ChartType != "MapFlowOut" && options.ChartType != "MapFlowIn")) {
            $("#" + This[0].id).html("<table><tr><td style='width:" + options.DivWidth + "px;height:" + options.DivHeight + "px;text-align:center;vertical-align:middle;'>无数据</td></tr></table>");
            $("#" + This[0].id).css("background-color", isNullProperty(options.BgColor) ? "#ffffff" : options.BgColor);
            if (options.callback.complete != null && typeof options.callback.complete == 'function') {
                options.callback.complete(null, options);
            }
        }
        else {
            //得到Echarts的options
            var eOptions = $.extend(true, defaultEchartOptions(options), resetOptions(options));

            //引入echarts.js文件，以前项目不用在页面增加对echarts.js文件的引入
            $.ajax({
                url: getRootPath() + "/projects/SampleChart/scripts/echarts/echarts.js",
                dataType: "script",
                cache: true,
                success: function (content, status) {
                    if (status == "success") {
                        require.config({
                            paths: {
                                'echarts': getRootPath() + "/projects/SampleChart/scripts/echarts",
                                'theme': getRootPath() + "/projects/SampleChart/scripts/echarts/theme/" + eOptions.theme
                            }
                        });
                        require(
                            [
                                'echarts',
                                'theme',
                                'echarts/chart/bar',  // 按需加载所需图表，如需动态类型切换功能，别忘了同时加载相应图表
                                'echarts/chart/line',
                                'echarts/chart/pie',
                                'echarts/chart/radar',
                                'echarts/chart/map',
                                'echarts/chart/gauge',
                                'echarts/chart/scatter',
                                'echarts/chart/treemap'
                            ],
                            function (ec, theme) {
                                var myChart = ec.init(document.getElementById(This[0].id), theme);

                                if (!isNullProperty(eOptions.clickEvent) && eOptions.clickEvent.length > 0) {
                                    //绑定事件
                                    var ecConfig = require('echarts/config');
                                    var eConsole = function (param) {
                                        var echartsPre = {
                                            getindex: function (attData, colname) {
                                                var ind = -1;
                                                if (attData.length > 0) {
                                                    for (var lk = 0; lk < attData.length; lk++) {
                                                        if (attData[lk] == colname) {
                                                            ind = lk;
                                                            break;
                                                        }
                                                    }
                                                }
                                                return ind;
                                            }
                                        };
                                        //参数依次为：对应的x轴值、对应的指标名、值、x轴的索引、指标对应的索引、div的ID、options对象
                                        $.each(eOptions.clickEvent, function (i, item) {
                                            var it = echartsPre.getindex(options.DataSource.colnames, param.seriesName);
                                            if (it == -1) {
                                                it = item.colindex;
                                            }
                                            if (item.colindex == it) {
                                                item.click(param.name, param.seriesName, param.value, param.dataIndex, it, This[0].id, options);
                                            }
                                        });
                                    }
                                    myChart.on(ecConfig.EVENT.CLICK, eConsole);
                                }

                                //图例点击事件
                                if (!isNullProperty(options.Event) && !isNullProperty(options.Event.LegendSelected)) {
                                    //绑定事件
                                    var ecConfig = require('echarts/config');
                                    var eConsole = function (param) {
                                        var currentIndex = "";
                                        var currentName = "";
                                        var selectedIndex = "";
                                        var selectedName = "";
                                        var notSelectedIndex = "";
                                        var notSelectedName = "";

                                        var colNames = options.DataSource.colnames;
                                        $.each(colNames, function (i, col) {
                                            if (colNames[i] == param.target) {
                                                currentName = param.target;
                                                currentIndex = i;
                                            }

                                            if (param.selected[colNames[i]]) {
                                                selectedIndex += i + ",";
                                                selectedName += colNames[i] + ",";
                                            }
                                            else if (!isNullProperty(param.selected[colNames[i]])) {
                                                notSelectedIndex += i + ",";
                                                notSelectedName += colNames[i] + ",";
                                            }
                                        });

                                        selectedIndex = selectedIndex.substr(0, selectedIndex.length - 1);
                                        selectedName = selectedName.substr(0, selectedName.length - 1);
                                        notSelectedIndex = notSelectedIndex.substr(0, notSelectedIndex.length - 1);
                                        notSelectedName = notSelectedName.substr(0, notSelectedName.length - 1);

                                        options.Event.LegendSelected(currentIndex, currentName, selectedIndex, selectedName, notSelectedIndex, notSelectedName);
                                    }
                                    myChart.on(ecConfig.EVENT.LEGEND_SELECTED, eConsole);
                                }

                                //是否为地图扩展的
                                if (options.IsMapExtend) {
                                    // 自定义扩展图表类型
                                    require('echarts/util/mapData/params').params[eOptions.mapType] = {
                                        getGeoJson: function (callback) {
                                            //mapExtend.json文件中记录着中文地区名称对应的json文件的名称
                                            $.getJSON(getRootPath() + '/projects/SampleChart/scripts/echarts/util/mapData/mapExtend.json', function (data) {
                                                $.getJSON(getRootPath() + '/projects/SampleChart/scripts/echarts/util/mapData/geoJson/' + data[eOptions.mapType] + '.json', callback);
                                            });
                                        }
                                    };
                                }

                                //myChart.setTheme('macarons');
                                myChart.setOption(eOptions, true);

                                if (options.isSaveImg) {
                                    if (isNullProperty(options.ImgPath)) {
                                        options.ImgPath = "~/Temp/ChartImg/";//注意要带后面的斜杠
                                    }

                                    var nowTime = new Date();
                                    nowTime = nowTime.format("yyyyMMddhhmmssS");
                                    if (isNullProperty(options.ImgName)) {
                                        options.ImgName = nowTime + ".png";
                                    }

                                    //延时5秒将图表保存成图片
                                    setTimeout(function () {
                                        $.ajax({
                                            url: getRootPath() + "/javascript/JSControl/SampleChart/Handler/Echart.ashx",
                                            type: "post",
                                            dataType: "text",
                                            data: {
                                                actionType: "saveImg",
                                                imgUrl: myChart.getDataURL("png"),
                                                imgPath: options.ImgPath,
                                                imgName: options.ImgName
                                            },
                                            cache: false,
                                            success: function (result) {

                                            },
                                            error: function (a, b, c) {
                                                alert(a + b + c);
                                            }
                                        });
                                    }, 5000);
                                }

                                //window.onresize = myChart.resize;
                                if (options.callback.autoAddData != null && typeof options.callback.autoAddData == 'function') {
                                    options.callback.autoAddData(myChart, options.DataSource);
                                }
                                if (options.callback.complete != null && typeof options.callback.complete == 'function') {
                                    options.callback.complete(myChart, options);
                                }
                            }
                        );
                    }
                },
                error: function (a, b, c) {

                }
            });
        }
    }
    //兼容echarts之前的options，原有接口不变，根据echarts需要会有新增
    function defaultOptions() {
        return {
            Width: "100%",
            Height: "260px",
            Title: "",
            SubTitle: "",
            XTitle: "",
            YTitle: "",
            Y2Title: "",
            analyzer: null,
            ChartType: "Column",
            XDataColName: "",
            XDataColIndex: "",
            YDataColName: "",
            YDataColIndex: "",
            Y2DataColName: "",
            Y2DataColIndex: "",
            YFormatType: "",
            YNumberPrefix: "",
            YDecimals: 0,//原为2
            Y2FormatType: "",
            Y2NumberPrefix: "",
            Y2Decimals: 0,//原为2
            BgColor: '',
            BorderColor: '#cccccc',
            XLabelStyle: "Wrap",//“Wrap（换行）”“Stagger（交错）”“Rotate（旋转）”或空，空表示采用默认的Wrap
            XLabelStep: 1,
            Is2D: false,
            IsFlash: true,
            IsAutoLimits: false,
            IsShowLimits: false,
            IsShowValue: false,
            IsShowPercentValue: false,
            IsShowLegend: true,
            IsShowLabel: true,
            IsMarginEnd: false,
            IsLabelInPer: false, //显示百分比数据； 此属性不要再用，换成；IsShowPercentValue
            //ColorArr: new Array("66B3FF", "FFCC00", "458B00", "8968CD", "0372AB", "EEEE00", "9AFF9A", "008B00", "836FFF", "FF3030"),
            ColorArr: [],//可以手动指定图例、指标的颜色，覆盖主题色系
            LegendPosition: "BOTTOM",//比如：RIGHT、BOTTOM，Echarts扩展了后面的LEFT、TOP、LEFTTOP、LEFTBOTTOM、RIGHTTOP、RIGHTBOTTOM
            captionName: '',
            XAxisMinValue: '',
            XAxisMaxValue: '',

            //==========以下为20150330后改用echarts新增的属性==========

            //工具条
            Toolbox: {
                show: false
            },

            IsSaveImg: false,//是否保存成图片
            ImgName: "",
            ImgPath: "",

            TitlePositionX: "center",//'center' | 'left' | 'right' 
            TitlePositionY: "top",//'top' | 'bottom' | 'center' 

            XIsTrim: false,//是否截取x轴坐标过长的值
            XTrimNum: 10,//x轴需要截取的长度
            LegendIsTrim: false,//是否截取图例过长的值
            LegendTrimNum: 10,//图例需要截取的长度

            LegendNotSelected: "",//不需要显示的图例索引，用逗号隔开，比如“1,3”，指标过多的情况下，可以将某些指标先隐藏，表现为图例中对应的项为灰色，点击之后可恢复显示，暂不支持饼图

            LegendRowCount: 1,//图例的行数，图例为多行时显示不全，比如为3行时要调整legend的下padding才能显示全

            IsShowX: true,//是否显示X轴
            IsShowY: true,//是否显示Y轴
            IsShowY2: true,//是否显示Y2轴

            XUnit: "",//X轴的单位
            YUnit: "",//Y轴的单位
            Y2Unit: "",//Y2轴的单位

            YLabelStyle: "Wrap",
            YLabelStep: 1,
            Y2LabelStyle: "Wrap",
            Y2LabelStep: 1,

            YSplitNumber: null,//y轴坐标分割的段数
            Y2SplitNumber: null,//y2轴坐标分割的段数

            //主题
            Theme: 'cmcc',

            FontSize: 12,//字体的大小，包括坐标轴、图例的字体

            DivWidth: 0,//当前div的宽度
            DivHeight: 100,//当前div的高度

            //堆叠柱形图或长条图专用
            IsAlign: false,//每层是否对齐

            //饼图专用
            LabelPosition: "outer",//项名称所在的位置，饼图可选为：'outer'（外部） | 'inner'（内部）


            //“雷达图”专用
            RadarMax: null,//数值型，各个方向上的最大值相同，比如得分100、百分比100，RadarMax、RadarMaxArray都指定则以RadarMaxArray为准
            RadarMaxArray: [],//每个方向上的最大值，样例数据:[{ text: '方向1', max: 80 },{ text: '方向2', max: 90 }]

            //饼图的一些特殊属性
            Pie: {
                radius: '55%',//半径
                center: ['50%', '50%']//中心位置
            },

            //“仪表盘”专用
            GaugeValue: 0,
            GaugeName: '指标',
            GaugeSplitNumber: 10,//大刻度分割的段数
            GaugeColor: [],//分段变色，分隔值为比例值，示例：[[0.2, '#ff4500'], [0.8, '#48b'], [1, '#228b22']]
            GaugeSplitColor: [],//分段变色，分隔值为具体的数值，示例：[[20, '#ff4500'], [80, '#48b'], [100, '#228b22']]


            //“地图”专用
            IsMapExtend: false,//是否是地图扩展，比如区县级别的就是扩展的
            MapType: ['贵州'],
            MapRangeOrLegend: "",//各个区域的颜色是依据“范围”还是“图例”，图例可分段，“范围”用“range”，“图例”用“legend”
            YMinColor: '#99BBFF',//MapRangeOrLegend为“range”时用到，表示图例的最小值的颜色
            YMaxColor: '#000088',//MapRangeOrLegend为“range”时用到，表示图例的最大值的颜色
            MapLegend: [],//图例信息，样例数据如下
            //[
            // { name: '<=20%', min: null, max: 20, color: '#ff4500' },
            // { name: '20%-80%', min: 20, max: 80, color: '#48b' },
            // { name: '>80%', min: 80, max: null, color: '#228b22' }
            //],

            //图表padding
            PaddingLeft: null,//左边距
            PaddingRight: null,//右边距
            PaddingTop: null,//上边距
            PaddingBottom: null,//下边距

            IsScroll: false,//是否增加滚动条及缩放功能
            ScrollStart: 0,//滚动条的起始值（百分比）
            ScrollEnd: 30,//滚动条的结束值（百分比）

            Event: {
                LegendSelected: null//图例的点击事件
            },

            callback: {
                autoAddData: null,
                complete: null
            }
        };
    }

    //echarts的默认options
    function defaultEchartOptions(options) {
        return {
            //背景色
            backgroundColor: "#fff",
            //标题
            title: {
                show: false,
                x: 'center',
                text: '',
                subtext: ''
            },
            //是否为动画效果
            animation: true,
            //工具栏
            toolbox: { show: false },
            //悬浮框
            tooltip: { trigger: 'axis' },
            //图例
            legend: {
                show: true,
                orient: 'horizontal',
                x: 'center',
                y: 'bottom',
                padding: [0, 5, 8, 5]
            },
            //是否启用拖拽重计算特性，默认关闭
            calculable: true,
            //数据过多时增加滚动条   
            //dataZoom:{show:true}
            //雷达图用到此属性
            polar: [],
            //地图中用到
            dataRange: [],
            //所有的序列数据
            series: [],

            //地图中才用到
            mapType: options.MapType,

            //不是echarts的原有属性
            clickEvent: options.ClickEvent
        };
    }

    //改echarts后用此方法
    function resetOptions(options) {
        var chartType = getChartType(options.ChartType);

        //==============得到echartsOptions的元素series的值（seriesData）、legend中的data值（colNames）及其他属性的值============== begin

        var colNames = [];//---为echartsOptions的元素legend中的data值，列名，即图例名，就是指标名        
        var seriesData = [];//---为echartsOptions的元素series的值，y轴值，数组元素为对象类型，也就是指标值，一个数组元素就是datatable中的一列及相关属性
        var indicator = [];//---雷达图中的option-polar-indicator
        var calculable = false;//是否启用拖拽重计算特性，默认关闭，false时就无法拖拽
        var dataRange = null;//---地图中的数据范围
        var dataZoom = null;
        var tooltip = { trigger: 'axis' };//悬浮框内容样式
        var grid = null;//图表的尺寸及边距，除饼图、环形图、地图、仪表盘的图表用
        var legend = null;//---图例

        if (isNullProperty(options.LegendPosition)) {
            options.LegendPosition = "BOTTOM";
        }

        //---为seriesData中的itemStyle属性，为图表的内容样式，可以针对全部数据也可针对一个指标的数据
        var itemStyle = {
            normal: {
                label: {
                    show: options.IsShowValue,
                    position: options.ChartType == "Bar" ? 'right' : 'top'
                    //,
                    //formatter: function (v) {
                    //    return axisFormatter(v.value, options.YFormatType, options.YUnit);
                    //}
                },
                //barBorderRadius: [5, 5, 0, 0]//是否为圆角，顺序为左上、右上、右下、左下  
                barBorderRadius: [0, 0, 0, 0]//是否为圆角，顺序为左上、右上、右下、左下
            }
        };
        //面积图
        if (options.ChartType == "Area" || options.ChartType == "StackedArea" || options.ChartType == "ScrollArea") {
            $.extend(true, itemStyle, { normal: { areaStyle: { type: 'default' } } });
        }

        //当为彩虹柱形图时
        if (options.ChartType == "ColumnRainbow") {
            $.extend(true, itemStyle, {
                normal: {
                    color: function (params) {
                        // build a color map as your need.
                        var colorList = [
                           '#C1232B', '#B5C334', '#FCCE10', '#E87C25', '#27727B',
                           '#FE8463', '#9BCA63', '#FAD860', '#F3A43B', '#60C0DD',
                           '#D7504B', '#C6E579', '#F4E001', '#F0805A', '#26C0C0'
                        ];
                        return colorList[params.dataIndex]
                    },
                    barBorderRadius: [5, 5, 5, 5]//是否为圆角，顺序为左上、右上、右下、左下 
                }
            });

            //去掉坐标轴的边框
            grid = { borderWidth: 0 };
        }

        var dataSource = options.DataSource;//数据源   

        var xData = [];//x轴值，就是维度值
        var xDataColIndex = 0;//x轴的索引值，只有一个x轴
        if (!isNullProperty(options.XDataColIndex)) {
            xDataColIndex = parseInt(options.XDataColIndex);
        }
        else if (!isNullProperty(options.XDataColName)) {
            xDataColIndex = existArr(options.DataSource.colnames, options.XDataColName);
        }
        for (var r = 0; r < options.DataSource.rows.length; r++) {
            var tmp = dataSource.rows[r]["col" + xDataColIndex];
            xData.push(tmp);//得到x轴的所有值，即所有维度值
        }

        var yDataColIndex = "";//y1轴的索引值
        if (!isNullProperty(options.YDataColIndex)) {
            //前后都加上","，是为了可以用字符串的indexOf判断是否包含此列，因为数组的indexOf在IE8（含）以下不支持
            yDataColIndex = "," + options.YDataColIndex + ",";
        }
        else if (!isNullProperty(options.YDataColName)) {
            var tempYColName = options.YDataColName.split(',');
            for (var i = 0; i < tempYColName.length; i++) {
                var tempColIndex = existArr(options.DataSource.colnames, tempYColName[i]);
                if (tempColIndex < 0) {
                    continue;
                }
                if (tempColIndex == xDataColIndex) {
                    continue;
                }
                yDataColIndex += "," + tempColIndex;
            }
            yDataColIndex += ",";
        }

        var y2DataColIndex = "";//y2轴的索引值
        if (!isNullProperty(options.Y2DataColIndex)) {
            y2DataColIndex = "," + options.Y2DataColIndex + ",";
        }
        else if (!isNullProperty(options.Y2DataColName)) {
            var tempYColName = options.Y2DataColName.split(',');
            for (var i = 0; i < tempYColName.length; i++) {
                var tempColIndex = existArr(options.DataSource.colnames, tempYColName[i]);
                if (tempColIndex < 0) {
                    continue;
                }
                if (tempColIndex == xDataColIndex) {
                    continue;
                }
                y2DataColIndex += "," + tempColIndex;
            }
            y2DataColIndex += ",";
        }

        var yIsNull = yDataColIndex == "" ? true : false;
        var y2IsNull = y2DataColIndex == "" ? true : false;

        //除饼图、矩形树图、雷达图、地图、仪表盘、散点图之外的图表
        if (chartType != "tree" && chartType != "PieDoughnut" && chartType != "pie" && chartType != "treemap" && chartType != "radar" && chartType != "map" && chartType != "MapFlowOut" && chartType != "MapFlowIn" && chartType != "MapScatter" && chartType != "gauge" && chartType != "scatter") {

            //遍历每列，c为列索引
            for (var c = 1; c < dataSource.colnames.length; c++) {
                var isInY = yDataColIndex.indexOf("," + c.toString() + ',') >= 0 ? true : false;
                var isInY2 = y2DataColIndex.indexOf("," + c.toString() + ',') >= 0 ? true : false;


                var yAxisIndex = 0;//用哪条y轴，0为左侧，1为右侧

                //==============获得组合图中各子图的图表类型============== begin
                //单y轴组合图： Combi1：组合(柱,线,面积)，Combi2：组合(柱,线)，Combi3：组合(堆叠,线)
                if (options.ChartType == "Combi1" || options.ChartType == "Combi2" || options.ChartType == "Combi3") {
                    //SubChartType均未指定
                    if (isNullProperty(options.SubChartType)) {
                        chartType = "bar";
                    }
                    else {
                        var i = 0;
                        for (i = 0; i < options.SubChartType.length; i++) {
                            //此列在SubChartType中指定了图表类型
                            if (options.SubChartType[i].colindex == c) {
                                break;
                            }
                        }
                        //此列在SubChartType中未指定图表类型
                        if (i == options.SubChartType.length) {
                            chartType = "bar";
                        }
                        else {
                            chartType = getChartType(options.SubChartType[i].type);
                            //组合图中有面积类型时的样式
                            if (options.SubChartType[i].type == "Area") {
                                $.extend(true, itemStyle, { normal: { areaStyle: { type: 'default' } } });
                            }
                        }
                    }
                }
                else if (options.ChartType == "Combi1Y") {//双y轴，Combi1Y：组合(柱,线,面积)(Y2)
                    //以下情况用右侧y轴
                    if (isInY2) {
                        yAxisIndex = 1;
                    }

                    var i = 0;
                    //SubChartType均未指定
                    if (options.SubChartType == null) {
                        if (isInY2) {
                            chartType = "line";
                        }
                        else {
                            chartType = "bar";
                        }
                    }
                    else {
                        for (i = 0; i < options.SubChartType.length; i++) {
                            if (options.SubChartType[i].colindex == c) {
                                break;//此列指定了SubChartType
                            }
                        }
                        //此列未指定SubChartType，则用默认的，即左侧y1轴用bar，y2轴用line
                        if (i == options.SubChartType.length) {
                            //y2轴即右侧y轴默认为折线图
                            if (isInY2) {
                                chartType = "line";
                            }
                            else {//y1轴即左侧y轴默认为柱形图
                                chartType = "bar";
                            }
                        }
                        else {
                            chartType = getChartType(options.SubChartType[i].type);
                            //组合图中有面积类型时的样式
                            if (options.SubChartType[i].type == "Area") {
                                $.extend(true, itemStyle, { normal: { areaStyle: { type: 'default' } } });
                            }
                        }
                    }
                }     //双y轴，Combi2Y：组合(Y柱,Y2线)(Y2)，Combi3Y：组合(Y堆叠,Y2线)(Y2)
                else if (options.ChartType == "Combi2Y" || options.ChartType == "Combi3Y") {
                    //以下情况用右侧y轴
                    if (isInY2) {
                        yAxisIndex = 1;
                    }

                    //y2轴即右侧y轴用折线图，SubChartType无效
                    if (isInY2) {
                        chartType = "line";
                    }
                    else {//y1轴即左侧y轴用柱形图，SubChartType无效
                        chartType = "bar";
                    }
                }
                //==============获得组合图中各子图的图表类型============== end

                //当前列在y轴或y2轴的索引值内或y轴索引值未指定就全部显示
                if (yIsNull || isInY || isInY2) {
                    var yData = [];//datatable一列的值
                    //遍历每行，r为行索引
                    for (var r = 0; r < dataSource.rows.length; r++) {
                        //选中的柱图变色
                        if (options.HighLight != null && options.HighLight.length > 0) {
                            var isHighLight = false;
                            for (var i = 0; i < options.HighLight.length; i++) {
                                if (options.HighLight[i].colindex == c && options.HighLight[i].highvales == dataSource.rows[r]["col" + xDataColIndex]) {
                                    //柱图为瀑布样式时值显示到内部
                                    if (options.ChartType == "ColumnWaterfall") {
                                        $.extend(true, itemStyle, {
                                            normal: {
                                                label: { position: 'top' }
                                            }
                                        });
                                    }
                                    var highColor = 'green';
                                    if (!isNullProperty(options.HighLight[i].color)) {
                                        highColor = options.HighLight[i].color;
                                    }
                                    //此值为对象
                                    yData.push({
                                        value: dataSource.rows[r]["col" + c],
                                        itemStyle: $.extend(true, { normal: { color: highColor } }, itemStyle)
                                    });
                                    isHighLight = true;
                                    break;
                                }
                            }

                            if (isHighLight == false) {
                                yData.push(dataSource.rows[r]["col" + c]);
                            }
                        }
                        else {
                            yData.push(dataSource.rows[r]["col" + c]);
                        }
                    }

                    colNames.push(dataSource.colnames[c]);//显示的列名，即图例名，就是指标名，在下面的echartsOptions对象的legend中用到

                    //堆叠，如柱图有三部分堆叠
                    var isStacked = "";
                    if (options.ChartType == "ColumnWaterfall" || options.ChartType == "StackedColumn" || options.ChartType == "StackedBar" || options.ChartType == "StackedArea" || options.ChartType == "ScrollStackedColumn" || (options.ChartType == "Combi3" && chartType == "bar") || (options.ChartType == "Combi3Y" && chartType == "bar")) {
                        isStacked = "yes";
                    }

                    //当柱形图为组合瀑布图的时候
                    if (options.ChartType == "ColumnWaterfall") {
                        var placeHoledStyle = {
                            normal: {
                                barBorderColor: 'rgba(0,0,0,0)',
                                color: 'rgba(0,0,0,0)'
                            },
                            emphasis: {
                                barBorderColor: 'rgba(0,0,0,0)',
                                color: 'rgba(0,0,0,0)'
                            }
                        };

                        var tmpValue = yData[0];//获得“合计”值

                        //有高亮显示的时候，不是数值而是一个对象，所以此处要判断一下，否则会报错
                        if (typeof yData[0] == "object") {
                            tmpValue = yData[0].value;
                        }

                        var yDataCopy = [];
                        for (var i = 0; i < yData.length - 1; i++) {
                            var tmpV = 0;
                            if (typeof yData[i] == "object") {
                                tmpV = yData[i].value;
                            }
                            else {
                                tmpV = yData[i];
                            }
                            yDataCopy.push(tmpValue - tmpV);
                            if (i != 0) {
                                tmpValue -= tmpV;
                            }
                        }
                        yDataCopy.push(0);

                        //生成序列数据
                        seriesData.push({
                            name: "辅助",//列名，即指标名
                            type: chartType,//指定该系列数据所用的图表类型
                            yAxisIndex: yAxisIndex,//指定该系列数据所用的纵坐标轴
                            stack: isStacked,//堆叠，如柱图有三部分堆叠
                            barGap: 0,//柱间距离，默认为柱形宽度的30%，可设固定值 ，只针对柱形图
                            barCategoryGap: '50%',//类目间柱形距离
                            itemStyle: placeHoledStyle,
                            data: yDataCopy//指定该系列数据值
                        });

                        $.extend(true, itemStyle, { normal: { label: { position: 'top' } } });
                    }
                    var select = {
                        isHave: function (arrparam, indexcol) {
                            if (arrparam != undefined && typeof arrparam == 'object') {
                                for (var ki = 0; ki < arrparam.length; ki++) {
                                    if (arrparam[ki].colindex == indexcol) {
                                        return true
                                    }
                                }
                            }
                            return false;
                        }
                    }

                    //处理Y轴和Y2轴格式不同、单位不同的情况
                    var newItemStyle = null;//没用itemStyle，因为后面的itemStyle会覆盖前面的itemStyle
                    //处理Y轴和Y2轴格式不同、单位不同的情况下悬浮框值的格式化问题
                    var newTooltip = null;
                    if (isInY2) {
                        newItemStyle = $.extend(true, {
                            normal: {
                                label: {
                                    formatter: function (v) {
                                        return axisFormatter(v.value, options.Y2FormatType, options.Y2Unit, options.Y2Decimals);
                                    }
                                }
                            }
                        }, itemStyle);

                        if (!options.IsAlign && isStacked != "yes") {
                            newTooltip = {
                                trigger: 'item',
                                formatter: function (v) {
                                    var tmp = v.seriesName + "<br/>" + v.name + ":" + axisFormatter(v.value, options.Y2FormatType, options.Y2Unit, options.Y2Decimals);
                                    return tmp;
                                }
                            };
                        }
                        else {
                            newTooltip = {
                                trigger: 'axis'
                            }
                        }
                    }
                    else {
                        newItemStyle = $.extend(true, {
                            normal: {
                                label: {
                                    formatter: function (v) {
                                        return axisFormatter(v.value, options.YFormatType, options.YUnit, options.YDecimals);
                                    }
                                }
                            }
                        }, itemStyle);

                        if (!options.IsAlign && isStacked != "yes") {
                            newTooltip = {
                                trigger: 'item',
                                formatter: function (v) {
                                    var tmp = v.seriesName + "<br/>" + v.name + ":" + axisFormatter(v.value, options.YFormatType, options.YUnit, options.YDecimals);
                                    return tmp;
                                }
                            };
                        }
                        else {
                            newTooltip = {
                                trigger: 'axis'
                            }
                        }
                    }

                    //背景透明的情况下增加折线图的线的粗细
                    if (options.Theme == "dark") {
                        newItemStyle = $.extend(true, newItemStyle, {
                            normal: {
                                lineStyle: {
                                    width: 3
                                }
                            }
                        });
                    }

                    //生成序列数据
                    seriesData.push({
                        name: dataSource.colnames[c],//列名，即指标名
                        type: chartType,//指定该系列数据所用的图表类型
                        yAxisIndex: yAxisIndex,//指定该系列数据所用的纵坐标轴
                        stack: isStacked,//堆叠，如柱图有三部分堆叠
                        barGap: 0,//柱间距离，默认为柱形宽度的30%，可设固定值 ，只针对柱形图
                        barCategoryGap: '50%',//类目间柱形距离
                        //barWidth:20,
                        clickable: select.isHave(options.ClickEvent, c),
                        itemStyle: newItemStyle,
                        tooltip: newTooltip,
                        data: yData//指定该系列数据值
                    });


                    if (options.IsAlign == true) {
                        var placeHoledStyle = {
                            normal: {
                                barBorderColor: 'rgba(0,0,0,0)',
                                color: 'rgba(0,0,0,0)'
                            },
                            emphasis: {
                                barBorderColor: 'rgba(0,0,0,0)',
                                color: 'rgba(0,0,0,0)'
                            }
                        };

                        var tmpValue = 0;
                        for (var i = 0; i < yData.length; i++) {
                            if (yData[i] > tmpValue) {
                                tmpValue = yData[i];
                            }
                        }

                        tmpValue = Math.round(tmpValue * 1.2);

                        var yDataCopy = [];
                        for (var i = 0; i < yData.length; i++) {
                            yDataCopy.push(tmpValue - yData[i]);
                        }

                        //生成序列数据
                        seriesData.push({
                            name: dataSource.colnames[c],//列名，即指标名
                            type: chartType,//指定该系列数据所用的图表类型
                            yAxisIndex: yAxisIndex,//指定该系列数据所用的纵坐标轴
                            stack: isStacked,//堆叠，如柱图有三部分堆叠
                            barGap: 0,//柱间距离，默认为柱形宽度的30%，可设固定值 ，只针对柱形图
                            barCategoryGap: '50%',//类目间柱形距离
                            itemStyle: placeHoledStyle,
                            data: yDataCopy//指定该系列数据值
                        });
                    }
                }
            }

            if (options.IsAlign == true) {
                var fmt = '{b}';
                for (var i = 0; i < seriesData.length / 2; i++) {
                    fmt += "<br/>{a" + i * 2 + "}:{c" + i * 2 + "}";
                }

                //悬浮框样式
                tooltip = {
                    trigger: 'axis',
                    axisPointer: {            // 坐标轴指示器，坐标轴触发有效
                        type: 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
                    },
                    formatter: fmt
                };
            }
            else if (isStacked == "yes" && options.ChartType != "ColumnWaterfall") {
                //悬浮框样式
                tooltip = {
                    trigger: 'axis'
                };
            }
            else {
                //悬浮框样式
                tooltip = {
                    trigger: 'item'
                    //,
                    //formatter: '{a}<br/>{b}:{c}'
                    //formatter: function (v) {
                    //    var tmp = v.seriesName + "<br/>" + v.name + ":" + axisFormatter(v.value, options.YFormatType);
                    //    return tmp;
                    //}
                };
            }

            //图表的尺寸及边距
            if (grid == null) {
                grid = {};
            }

            $.extend(true, grid, {
                x: options.PaddingLeft != null ? options.PaddingLeft : 50,
                x2: options.PaddingRight != null ? options.PaddingRight : (options.LegendPosition.indexOf("RIGHT") >= 0 ? 120 : (isNullProperty(options.Y2DataColIndex) ? 15 : 50)),
                y: options.PaddingTop != null ? options.PaddingTop : 25,
                y2: options.PaddingBottom != null ? options.PaddingBottom : (options.XLabelStyle == "Rotate" ? 100 : 55)
                //,
                //width: "90%",//getDefaultLength(options.Width)
                //height: "60%"
            });

            if (options.IsScroll == true || options.ChartType == "ScrollColumn" || options.ChartType == "ScrollLine" || options.ChartType == "ScrollArea" || options.ChartType == "ScrollStackedColumn") {
                dataZoom = {
                    orient: "horizontal", //水平显示
                    show: true, //显示滚动条                    
                    //zoomLock:true,
                    start: options.ScrollStart, //起始值为20%
                    end: options.ScrollEnd  //结束值为60%
                };
            }
        }
        else if (chartType == "scatter") {
            //散点图x、y轴都是指标，用类似“YDataColIndex: "1,2"”来指定，也可用“YDataColIndex: "1",Y2DataColIndex: "2"”指定
            if (y2IsNull && (!yIsNull)) {
                y2DataColIndex = "," + yDataColIndex.split(',')[2] + ",";
                yDataColIndex = "," + yDataColIndex.split(',')[1] + ",";
            }
            else if (yIsNull) {
                yDataColIndex = ",1,";
                y2DataColIndex = ",2,";
            }
            y2IsNull = false;//y2轴置为非空，下面的坐标轴处理的地方要用到

            //悬浮框样式
            tooltip = {
                trigger: 'item',
                formatter: '{a}<br/>{b}:{c}'
            };

            for (var r = 0; r < dataSource.rows.length; r++) {
                var curValue = dataSource.rows[r]["col" + xDataColIndex];
                if (colNames.toString().indexOf(curValue) < 0) {
                    colNames.push(curValue);
                }
            }

            for (var i = 0; i < colNames.length; i++) {
                var data = [];
                for (var r = 0; r < dataSource.rows.length; r++) {
                    if (dataSource.rows[r]["col" + xDataColIndex] == colNames[i]) {
                        data.push([dataSource.rows[r]["col" + yDataColIndex.split(',')[1]], dataSource.rows[r]["col" + y2DataColIndex.split(',')[1]]]);
                    }
                }
                seriesData.push({
                    name: colNames[i],
                    type: 'scatter',
                    data: data
                });
            }

            //处理坐标轴
            //y2IsNull = true;
        }
        else if (chartType == "pie" || chartType == "PieDoughnut") {
            //悬浮框样式
            tooltip = {
                trigger: 'item',
                //formatter: '{b}<br/>{c}<br/>{d}%'
                formatter: function (v) {
                    var tmp = v.name + "<br/>" + axisFormatter(v.value, options.YFormatType, options.YUnit, options.YDecimals) + "<br/>" + v.percent + "%";
                    return tmp;
                }
            };
            calculable = false;

            //圆环饼图需要分层
            if (options.ChartType == "PieLayered") {
                calculable = false;
                var dataStyle = {
                    normal: {
                        label: { show: false },
                        labelLine: { show: false }
                    }
                };
                var placeHolderStyle = {
                    normal: {
                        color: 'rgba(0,0,0,0)',
                        label: { show: false },
                        labelLine: { show: false }
                    },
                    emphasis: {
                        color: 'rgba(0,0,0,0)'
                    }
                };
                var tmpTotal = 0;
                for (var r = 0; r < dataSource.rows.length; r++) {
                    tmpTotal += parseFloat(dataSource.rows[r]["col" + (yIsNull ? 1 : yDataColIndex.split(',')[1])]);
                }

                colNames = [];
                var radius1 = 125;
                var radius2 = 150;
                for (var r = 0; r < dataSource.rows.length; r++) {
                    var yData = [];
                    var curName = dataSource.rows[r]["col" + xDataColIndex];
                    var curValue = dataSource.rows[r]["col" + (yIsNull ? 1 : yDataColIndex.split(',')[1])];

                    var tmpName = tmpTotal > 0 ? (curValue / tmpTotal * 100).toFixed(2) + "%" + curName : "0%" + curName;

                    colNames.push(tmpName);
                    yData.push({
                        value: curValue,
                        name: tmpName
                    });
                    yData.push({
                        value: tmpTotal - curValue,
                        name: 'invisible',
                        itemStyle: placeHolderStyle
                    });

                    seriesData.push({
                        name: r.toString(),
                        type: chartType,
                        clockWise: false,
                        radius: [radius1, radius2],
                        itemStyle: dataStyle,
                        data: yData
                    });

                    radius1 -= 25;
                    radius2 -= 25;
                }

                //悬浮框样式
                tooltip = {
                    show: false
                };
            }
            else if (chartType == "PieDoughnut") {//嵌套饼图
                var x1Col = options.XDataColIndex.split(',')[0];
                var x2Col = options.XDataColIndex.split(',')[1];
                var x1Str = "";
                var x2Str = "";
                var x1Data = {
                    "colnames": ["内层维度", "内层指标"],
                    "rows": []
                };
                var x2Data = {
                    "colnames": ["外层维度", "外层指标"],
                    "rows": []
                };

                for (var r = 0; r < dataSource.rows.length; r++) {
                    var tmpX1Str = dataSource.rows[r]["col" + x1Col];
                    if (x1Str.indexOf(tmpX1Str) < 0) {
                        x1Str += tmpX1Str + ",";
                    }
                }
                x1Str = x1Str.substr(0, x1Str.length - 1).split(',');

                for (var i = 0; i < x1Str.length; i++) {
                    var tmpX1Value = 0;
                    for (var r = 0; r < dataSource.rows.length; r++) {
                        var tmpX1Str = dataSource.rows[r]["col" + x1Col];
                        if (x1Str[i] == tmpX1Str) {
                            var tmpX2Value = parseFloat(dataSource.rows[r]["col" + (yIsNull ? 2 : yDataColIndex.split(',')[1])]);
                            tmpX1Value += tmpX2Value;
                            x2Data.rows.push({ "col0": dataSource.rows[r]["col" + x2Col], "col1": tmpX2Value });
                        }
                    }
                    x1Data.rows.push({ "col0": x1Str[i], "col1": tmpX1Value });
                }

                var yX1Data = [];
                for (var r = 0; r < x1Data.rows.length; r++) {
                    var curName = x1Data.rows[r]["col0"];
                    colNames.push(curName);
                    var curValue = x1Data.rows[r]["col1"];

                    yX1Data.push({
                        name: curName,
                        value: curValue,
                        itemStyle: {
                            normal: {
                                label: {
                                    show: true,
                                    position: 'inner',
                                    formatter: function (value) {
                                        var tmp = value.name;
                                        if (options.XIsTrim && !isNullProperty(tmp) && tmp.length > options.XTrimNum) {
                                            tmp = tmp.substr(0, options.XTrimNum) + "...";
                                        }

                                        return tmp;
                                    }
                                },
                                labelLine: { show: false }
                            }
                        }
                    });
                }

                var seriesX1Opt = {
                    name: options.Title,
                    type: 'pie',
                    radius: '45%',
                    center: options.Pie.center,
                    itemStyle: {
                        normal: {
                            label: {
                                textStyle: {
                                    fontSize: options.FontSize
                                }
                            }
                        }
                    },
                    data: yX1Data
                };

                seriesData.push(seriesX1Opt);

                var yX2Data = [];
                for (var r = 0; r < x2Data.rows.length; r++) {
                    var curName = x2Data.rows[r]["col0"];
                    colNames.push(curName);
                    var curValue = x2Data.rows[r]["col1"];

                    yX2Data.push({
                        name: curName,
                        value: curValue,
                        itemStyle: {
                            normal: {
                                label: {
                                    show: true,
                                    position: options.LabelPosition,
                                    formatter: function (value) {
                                        var tmp = value.name;
                                        if (options.XIsTrim && !isNullProperty(tmp) && tmp.length > options.XTrimNum) {
                                            tmp = tmp.substr(0, options.XTrimNum) + "...";
                                        }
                                        if (options.IsShowValue) {
                                            if (options.IsShowPercentValue) {
                                                tmp += ":" + value.percent + "%";
                                            }
                                            else {
                                                tmp += ":" + value.value;
                                            }
                                        }

                                        return tmp;
                                    }
                                },
                                labelLine: { show: options.LabelPosition == 'inner' ? false : true, length: 10 }//标签视觉引导线，默认显示
                            }
                        }
                    });
                }

                var seriesX2Opt = {
                    name: options.Title,
                    type: 'pie',
                    radius: ['65%', '90%'],
                    center: options.Pie.center,
                    itemStyle: {
                        normal: {
                            label: {
                                textStyle: {
                                    fontSize: options.FontSize
                                }
                            }
                        }
                    },
                    data: yX2Data
                };

                seriesData.push(seriesX2Opt);
            }
            else {
                colNames = xData;//饼图时图例名就是维度值
                var yData = [];
                for (var r = 0; r < dataSource.rows.length; r++) {
                    var curName = dataSource.rows[r]["col" + xDataColIndex];
                    //if (options.LegendIsTrim && !isNullProperty(curName) && curName.length > options.LegendTrimNum) {
                    //    curName = curName.substr(0, options.LegendTrimNum) + "...";
                    //}
                    var curValue = dataSource.rows[r]["col" + (yIsNull ? 1 : yDataColIndex.split(',')[1])];
                    //选中的变色
                    if (options.HighLight != null && options.HighLight.length > 0) {
                        var isHighLight = false;
                        for (var i = 0; i < options.HighLight.length; i++) {
                            if (options.HighLight[i].highvales == dataSource.rows[r]["col" + xDataColIndex]) {
                                var highColor = 'green';
                                if (!isNullProperty(options.HighLight[i].color)) {
                                    highColor = options.HighLight[i].color;
                                }

                                yData.push({
                                    name: curName,
                                    value: curValue,
                                    itemStyle: {
                                        normal: {
                                            color: highColor,
                                            label: {
                                                show: true,
                                                position: options.LabelPosition,
                                                //formatter: options.IsShowValue ? (options.IsShowPercentValue ? '{b}:{d}%' : '{b}:{c}') : '{b}'
                                                formatter: function (value) {
                                                    var tmp = value.name;
                                                    if (options.XIsTrim && !isNullProperty(tmp) && tmp.length > options.XTrimNum) {
                                                        tmp = tmp.substr(0, options.XTrimNum) + "...";
                                                    }
                                                    if (options.IsShowValue) {
                                                        if (options.IsShowPercentValue) {
                                                            tmp += ":" + value.percent + "%";
                                                        }
                                                        else {
                                                            tmp += ":" + axisFormatter(value.value, options.YFormatType, options.YUnit, options.YDecimals);
                                                        }
                                                    }

                                                    return tmp;
                                                }
                                            },
                                            labelLine: { show: options.LabelPosition == 'inner' ? false : true, length: 10 }//标签视觉引导线，默认显示
                                        }
                                    }
                                });

                                isHighLight = true;
                                break;
                            }
                        }

                        if (isHighLight == false) {
                            yData.push({
                                name: curName,
                                value: curValue,
                                itemStyle: {
                                    normal: {
                                        label: {
                                            show: true,
                                            position: options.LabelPosition,
                                            //formatter: options.IsShowValue ? (options.IsShowPercentValue ? '{b}:{d}%' : '{b}:{c}') : '{b}'
                                            formatter: function (value) {
                                                var tmp = value.name;
                                                if (options.XIsTrim && !isNullProperty(tmp) && tmp.length > options.XTrimNum) {
                                                    tmp = tmp.substr(0, options.XTrimNum) + "...";
                                                }
                                                if (options.IsShowValue) {
                                                    if (options.IsShowPercentValue) {
                                                        tmp += ":" + value.percent + "%";
                                                    }
                                                    else {
                                                        tmp += ":" + axisFormatter(value.value, options.YFormatType, options.YUnit, options.YDecimals);
                                                    }
                                                }

                                                return tmp;
                                            }
                                        },
                                        labelLine: { show: options.LabelPosition == 'inner' ? false : true, length: 10 }//标签视觉引导线，默认显示
                                    }
                                }
                            });
                        }
                    }
                    else {
                        yData.push({
                            name: curName,
                            value: curValue,
                            itemStyle: {
                                normal: {
                                    label: {
                                        show: true,
                                        position: options.LabelPosition,
                                        //formatter: options.IsShowValue ? (options.IsShowPercentValue ? '{b}:{d}%' : '{b}:{c}') : '{b}'
                                        formatter: function (value) {
                                            var tmp = value.name;
                                            if (options.XIsTrim && !isNullProperty(tmp) && tmp.length > options.XTrimNum) {
                                                tmp = tmp.substr(0, options.XTrimNum) + "...";
                                            }
                                            if (options.IsShowValue) {
                                                if (options.IsShowPercentValue) {
                                                    tmp += ":" + value.percent + "%";
                                                }
                                                else {
                                                    tmp += ":" + axisFormatter(value.value, options.YFormatType, options.YUnit, options.YDecimals);
                                                }
                                            }

                                            return tmp;
                                        }
                                    },
                                    labelLine: { show: options.LabelPosition == 'inner' ? false : true, length: 10 }//标签视觉引导线，默认显示
                                }
                            }
                        });
                    }
                }

                var seriesOpt = {
                    name: options.Title,
                    type: chartType,
                    radius: options.Pie.radius,
                    center: options.Pie.center,
                    itemStyle: {
                        normal: {
                            label: {
                                textStyle: {
                                    fontSize: options.FontSize
                                }
                            }
                        }
                    },
                    data: yData
                };

                //饼图的变种：环形饼图
                if (options.ChartType == "Doughnut") {
                    calculable = true;
                    seriesOpt = $.extend(true, seriesOpt, { radius: ['20%', '50%'] });
                }

                //饼图的变种：南丁格尔玫瑰图
                if (options.ChartType == "PieRose") {
                    calculable = false;
                    seriesOpt = $.extend(true, seriesOpt, { radius: [30, '50%'], roseType: "area" });
                }

                seriesData.push(seriesOpt);
            }
        }
        else if (chartType == "treemap") {

            calculable = false;

            colNames = xData;//饼图时图例名就是维度值

            var tmpTotal = 0;//计算总数，用于求百分比
            for (var r = 0; r < dataSource.rows.length; r++) {
                tmpTotal += parseFloat(dataSource.rows[r]["col" + (yIsNull ? 1 : yDataColIndex.split(',')[1])]);
            }

            var yData = [];
            var curTotal = 0;//为避免百分比之和不满100，最后一行的时候用100减去前面之和
            for (var r = 0; r < dataSource.rows.length; r++) {
                var curName = dataSource.rows[r]["col" + xDataColIndex];
                var curValue = parseFloat(dataSource.rows[r]["col" + (yIsNull ? 1 : yDataColIndex.split(',')[1])]);

                var yDataTmp = {
                    name: curName,
                    value: curValue,
                    itemStyle: {
                        normal: {
                            label: {
                                show: true,
                                x: 5,
                                y: 25,
                                textStyle: {
                                    color: "#ffffff",
                                    fontSize: 12
                                },
                                formatter: function (name, value) {
                                    var tmp = name;
                                    if (options.IsShowValue) {
                                        if (options.IsShowPercentValue) {
                                            var percent = 0;
                                            if (tmpTotal > 0) {
                                                percent = parseFloat((value / tmpTotal * 100).toFixed(0));
                                            }

                                            curTotal += percent;
                                            //为避免百分比之和不满100，最后一行的时候用100减去前面之和
                                            if (r == dataSource.rows.length - 1 && tmpTotal > 0) {
                                                tmp += "\n" + value + "\n" + (100 - curTotal) + "%";
                                            }
                                            else {
                                                tmp += "\n" + value + "\n" + percent + "%";
                                            }
                                        }
                                        else {
                                            tmp += "\n" + value;
                                        }
                                    }

                                    return tmp;
                                }
                            },
                            borderWidth: 1
                        },
                        emphasis: {
                            label: {
                                show: true
                            }
                        }
                    }
                };

                if (options.HighLight != null && options.HighLight.length > 0 && options.HighLight[0].highvales == dataSource.rows[r]["col" + xDataColIndex]) {
                    $.extend(true, yDataTmp, {
                        itemStyle: {
                            normal: {
                                color: 'green'
                            }
                        }
                    });
                }
                yData.push(yDataTmp);
            }

            //悬浮框样式
            //tooltip = null;
            tooltip = {
                trigger: 'item',
                formatter: '{b}<br/>{c}'
                //formatter: function (name, value) {
                //    var tmp = name;
                //    if (options.IsShowValue) {
                //        if (options.IsShowPercentValue) {
                //            var percent = parseFloat((value / tmpTotal * 100).toFixed(0))
                //            //为避免百分比之和不满100，最后一行的时候用100减去前面之和
                //            if (r == dataSource.rows.length - 1) {
                //                tmp += "\n" + value + "\n" + (100 - curTotal) + "%";
                //            }
                //            else {
                //                tmp += "\n" + value + "\n" + percent + "%";
                //            }
                //        }
                //        else {
                //            tmp += "\n" + value;
                //        }
                //    }

                //    return tmp;
                //}
            };

            seriesData.push({
                name: options.Title,
                type: chartType,
                center: ['50%', '50%'],//中心坐标，支持绝对值（px）和百分比
                size: ['99%', '94%'],//大小，支持绝对值（px）和百分比
                data: yData
            });
        }
        else if (chartType == "tree") {

            calculable = false;

            colNames = xData;//饼图时图例名就是维度值

            var tmpTotal = 0;//计算总数，用于求百分比
            for (var r = 0; r < dataSource.rows.length; r++) {
                tmpTotal += parseFloat(dataSource.rows[r]["col" + (yIsNull ? 1 : yDataColIndex.split(',')[1])]);
            }

            var yData = [];
            var curTotal = 0;//为避免百分比之和不满100，最后一行的时候用100减去前面之和
            for (var r = 0; r < dataSource.rows.length; r++) {
                var curName = dataSource.rows[r]["col" + xDataColIndex];
                var curValue = parseFloat(dataSource.rows[r]["col" + (yIsNull ? 1 : yDataColIndex.split(',')[1])]);

                var yDataTmp = {
                    name: curName,
                    value: curValue,
                    itemStyle: {
                        normal: {
                            label: {
                                show: true,
                                x: 5,
                                y: 25,
                                textStyle: {
                                    color: "#ffffff",
                                    fontSize: 12
                                },
                                formatter: function (name, value) {
                                    var tmp = name;
                                    if (options.IsShowValue) {
                                        if (options.IsShowPercentValue) {
                                            var percent = 0;
                                            if (tmpTotal > 0) {
                                                percent = parseFloat((value / tmpTotal * 100).toFixed(0));
                                            }

                                            curTotal += percent;
                                            //为避免百分比之和不满100，最后一行的时候用100减去前面之和
                                            if (r == dataSource.rows.length - 1 && tmpTotal > 0) {
                                                tmp += "\n" + value + "\n" + (100 - curTotal) + "%";
                                            }
                                            else {
                                                tmp += "\n" + value + "\n" + percent + "%";
                                            }
                                        }
                                        else {
                                            tmp += "\n" + value;
                                        }
                                    }

                                    return tmp;
                                }
                            },
                            borderWidth: 1
                        },
                        emphasis: {
                            label: {
                                show: true
                            }
                        }
                    }
                };

                if (options.HighLight != null && options.HighLight.length > 0 && options.HighLight[0].highvales == dataSource.rows[r]["col" + xDataColIndex]) {
                    $.extend(true, yDataTmp, {
                        itemStyle: {
                            normal: {
                                color: 'green'
                            }
                        }
                    });
                }
                yData.push(yDataTmp);
            }

            //悬浮框样式
            tooltip = {
                trigger: 'item',
                formatter: '{b}<br/>{c}'
            };

            seriesData.push({
                name: options.Title,
                type: chartType,
                data: yData
            });
        }
        else if (chartType == "radar") {

            //雷达图指定“最大值”
            if (options.RadarMaxArray.length > 0) {//每个方向上的最大值，样例数据:[{ text: '方向1', max: 80 },{ text: '方向2', max: 90 }]
                for (var r = 0; r < options.RadarMaxArray.length; r++) {
                    indicator.push({ text: options.RadarMaxArray[r].text, max: options.RadarMaxArray[r].max });
                }
            }
            else if (!isNullProperty(options.RadarMax)) {//各个方向上的最大值相同，比如得分100、百分比100
                for (var r = 0; r < dataSource.rows.length; r++) {
                    indicator.push({ text: xData[r], max: options.RadarMax });
                }
            }
            else if (!isNullProperty(y2DataColIndex)) {//此处用y2DataColIndex表示最大值列的索引
                for (var r = 0; r < dataSource.rows.length; r++) {
                    indicator.push({ text: xData[r], max: dataSource.rows[r]["col" + options.Y2DataColIndex] });
                }
            }
            else {//未指定最大值就取每行的最大值的1.1倍作为最大值
                for (var r = 0; r < dataSource.rows.length; r++) {
                    var rowMax = 0;//一行中的最大值
                    var curValue = 0;//当前值
                    for (var c = 1; c < dataSource.colnames.length; c++) {
                        curValue = parseFloat(dataSource.rows[r]["col" + c]);
                        if (curValue > rowMax) {
                            rowMax = curValue;
                        }
                    }
                    if (rowMax == 0) {
                        rowMax = 1;//一个轴上全为0的时候，最大值通过上面计算就是0，但此时的点会不在中心，所以将rowMax改为大于0的某个值
                    }
                    indicator.push({ text: xData[r], max: parseFloat((rowMax * 1.1).toFixed(2)) });
                }
            }

            var yData = [];//此值为对象，表示雷达图的所有指标的值
            //遍历每列，c为列索引
            for (var c = 1; c < dataSource.colnames.length; c++) {
                var isInY = yDataColIndex.indexOf("," + c.toString() + ',') >= 0 ? true : false;
                var isInY2 = y2DataColIndex.indexOf("," + c.toString() + ',') >= 0 ? true : false;

                //雷达图的各指标用yDataColIndex表示
                if ((!isInY2) && (yIsNull || isInY)) {
                    var value = [];//一个指标的所有值
                    //遍历每行，r为行索引
                    for (var r = 0; r < dataSource.rows.length; r++) {
                        value.push(dataSource.rows[r]["col" + c]);
                    }
                    //此值为对象，表示雷达图的“所有指标”的值
                    yData.push({
                        value: value,
                        name: dataSource.colnames[c]
                    });
                    colNames.push(dataSource.colnames[c]);//显示的列名，即图例名，就是指标名
                }
            }
            seriesData.push({
                name: options.Title,
                type: chartType,//指定图表类型
                itemStyle: itemStyle,
                data: yData//指定数据值
            });

            legend = {
                orient: 'vertical',
                x: 'right'
            };

            //grid = {
            //    x: options.PaddingLeft != null ? options.PaddingLeft : 70,
            //    x2: options.PaddingRight != null ? options.PaddingRight : (options.LegendPosition == "RIGHT" ? 120 : 70),
            //    y: options.PaddingTop != null ? options.PaddingTop : 25,
            //    y2: options.PaddingBottom != null ? options.PaddingBottom : (options.XLabelStyle == "Rotate" ? 100 : 55)
            //    //,
            //    //width: "90%",//getDefaultLength(options.Width)
            //    //height: "60%"
            //};

        }
        else if (chartType == "map") {
            if (options.MapRangeOrLegend == "legend") {
                //悬浮框样式
                if (options.IsShowPercentValue) {
                    tooltip = {
                        trigger: 'item',
                        formatter: '{b}<br/>{c}%'
                    };
                }
                else {
                    tooltip = {
                        trigger: 'item',
                        formatter: '{b}<br/>{c}'
                    };
                }
                var legendNames = [];

                var yData = [];//datatable一列的值
                //用xData表示地图中的各个区域，把区域看成维度，如果未指定就默认为西藏的，为查看实例用
                if (xData.length == 0) {
                    xData = ["阿里地区", "那曲地区", "日喀则地区", "拉萨市"];
                }

                var c = 1;//列索引
                if (!yIsNull) {
                    c = options.YDataColIndex.split(',')[0];
                }

                colNames = dataSource.colnames[c];//图例名


                var tmpMax = null;
                var tmpMin = null;
                for (var i = 0; i < options.MapLegend.length; i++) {
                    tmpMax = options.MapLegend[i].max;
                    tmpMin = options.MapLegend[i].min;

                    var yData = [];
                    var tmpName = "";
                    var tmpValue = 0;

                    //遍历每行，r为行索引
                    for (var r = 0; r < dataSource.rows.length; r++) {
                        tmpName = xData[r];
                        tmpValue = dataSource.rows[r]["col" + c];

                        if (tmpMax == null) {
                            if (tmpMin == null) {
                                yData.push({
                                    name: tmpName,
                                    value: tmpValue
                                });
                            }
                            else if (tmpValue > tmpMin) {
                                yData.push({
                                    name: tmpName,
                                    value: tmpValue
                                });
                            }
                        }
                        else if (tmpValue <= tmpMax) {
                            if (tmpMin == null) {
                                yData.push({
                                    name: tmpName,
                                    value: tmpValue
                                });
                            }
                            else if (tmpValue > tmpMin) {
                                yData.push({
                                    name: tmpName,
                                    value: tmpValue
                                });
                            }
                        }
                    }

                    seriesData.push({
                        name: options.MapLegend[i].name,
                        type: 'map',
                        mapType: options.MapType[0],
                        selectedMode: 'single',
                        itemStyle: {
                            normal: {
                                label: { show: true },
                                borderColor: 'rgba(255,255,255,1)',
                                borderWidth: 0.5,
                                areaStyle: { color: options.MapLegend[i].color }
                            },
                            emphasis: { label: { show: true } }
                        },
                        data: yData
                    });

                    legendNames.push(options.MapLegend[i].name);
                }

                legend = {
                    show: options.IsShowLegend,
                    orient: (options.LegendPosition.indexOf("RIGHT") >= 0 || options.LegendPosition.indexOf("LEFT") >= 0) ? 'vertical' : 'horizontal',
                    x: options.LegendPosition.indexOf("RIGHT") >= 0 ? 'right' : (options.LegendPosition.indexOf("LEFT") >= 0 ? 'left' : 'center'),
                    y: options.LegendPosition.indexOf("TOP") >= 0 ? 'top' : (options.LegendPosition.indexOf("BOTTOM") >= 0 ? 'bottom' : 'center'),
                    data: legendNames
                };
            }
            else {
                //悬浮框样式
                tooltip = {
                    trigger: 'item',
                    formatter: '{b}<br/>{c}'
                };
                var yData = [];//datatable一列的值
                //用xData表示地图中的各个区域，把区域看成维度，如果未指定就默认为西藏的，为查看实例用
                if (xData.length == 0) {
                    xData = ["阿里地区", "那曲地区", "日喀则地区", "拉萨市"];
                }
                //遍历每列，c为列索引
                for (var c = 1; c < dataSource.colnames.length; c++) {
                    var isInY = yDataColIndex.indexOf("," + c.toString() + ',') >= 0 ? true : false;
                    var isInY2 = y2DataColIndex.indexOf("," + c.toString() + ',') >= 0 ? true : false;
                    if (yIsNull || isInY) {
                        //遍历每行，r为行索引
                        for (var r = 0; r < dataSource.rows.length; r++) {
                            yData.push({
                                name: xData[r],
                                value: dataSource.rows[r]["col" + c]
                            });
                        }
                    }
                    colNames = dataSource.colnames[c];//图例名
                }
                //colNames = options.Title;//图例名

                //未指定时，自动计算地图范围图例的最大值、最小值
                var yColIndex = yIsNull ? 1 : options.YDataColIndex;
                var maxMin = getColMaxMin(options.DataSource.rows, yColIndex);

                //数值范围，根据此范围各个区域可以显示不同的颜色
                dataRange = {
                    min: isNullProperty(options.YMinValue) ? Math.floor(options.DataSource.rows[maxMin.minrow]['col' + yColIndex]) : options.YMinValue,
                    max: isNullProperty(options.YMaxValue) ? Math.ceil(options.DataSource.rows[maxMin.maxrow]['col' + yColIndex]) : options.YMaxValue,
                    color: [options.YMaxColor, options.YMinColor],
                    text: ['高', '低'],           // 文本，默认为数值文本
                    calculable: true,
                    formatter: function (value) {
                        if (!isNullProperty(options.YUnit)) {
                            return value + '（' + options.YUnit + '）';
                        }
                        else {
                            return value;
                        }
                    },
                    precision: options.YDecimals//小数位数
                };
                seriesData.push({
                    name: options.Title,
                    type: chartType,//指定图表类型
                    mapType: options.MapType[0],
                    itemStyle: {
                        normal: {
                            label: { show: true },
                            borderColor: 'rgba(255,255,255,1)',
                            borderWidth: 0.2,
                            areaStyle: {
                                color: options.BgColor
                            }
                        },
                        emphasis: { label: { show: true } }
                    },
                    data: yData//指定数据值
                });
            }
        }
        else if (chartType == "MapFlowOut" || chartType == "MapFlowIn") {
            //悬浮框样式
            //tooltip = {
            //    trigger: 'item',
            //    formatter: '{b}<br/>{c}'
            //};

            //未指定时，自动计算地图范围图例的最大值、最小值
            var yColIndex = yIsNull ? 1 : options.YDataColIndex;
            var min = 0;
            var max = 100;
            var maxMin = null;

            if (options.DataSource.rows.length > 0) {
                maxMin = getColMaxMin(options.DataSource.rows, yColIndex);
                min = isNullProperty(options.YMinValue) ? Math.floor(options.DataSource.rows[maxMin.minrow]['col' + yColIndex]) : options.YMinValue;
                max = isNullProperty(options.YMaxValue) ? Math.ceil(options.DataSource.rows[maxMin.maxrow]['col' + yColIndex]) : options.YMaxValue;
            }

            //数值范围，根据此范围各个区域可以显示不同的颜色
            dataRange = {
                x: "right",
                y: "bottom",
                min: min,
                max: max,
                color: ['#ff3333', 'orange', 'yellow', 'lime', 'aqua'],
                calculable: true,
                formatter: function (value) {
                    if (!isNullProperty(options.YUnit)) {
                        return value + '（' + options.YUnit + '）';
                    }
                    else {
                        return value;
                    }
                },
                precision: options.YDecimals,//小数位数
                textStyle: {
                    color: 'auto'
                }
            };

            //获得legend的数据源
            var x1 = options.XDataColIndex.split(',')[0];//流出
            var x2 = options.XDataColIndex.split(',')[1];//流入
            var xStr = "";
            var x1Str = "";
            var x2Str = "";

            for (var r = 0; r < dataSource.rows.length; r++) {
                if (options.ChartType == "MapFlowIn") {//流入
                    x2Str = dataSource.rows[r]['col' + x2];
                    if (xStr.indexOf(x2Str) < 0) {
                        xStr += x2Str + ",";
                    }
                }
                else {//流出
                    x1Str = dataSource.rows[r]['col' + x1];
                    if (xStr.indexOf(x1Str) < 0) {
                        xStr += x1Str + ",";
                    }
                }
            }

            xData = xStr.substr(0, xStr.length - 1).split(',');
            colNames = xData;//legend的数据源

            legend = {
                show: options.IsShowLegend,
                orient: (options.LegendPosition.indexOf("RIGHT") >= 0 || options.LegendPosition.indexOf("LEFT") >= 0) ? 'vertical' : 'horizontal',
                x: options.LegendPosition.indexOf("RIGHT") >= 0 ? 'right' : (options.LegendPosition.indexOf("LEFT") >= 0 ? 'left' : 'center'),
                y: options.LegendPosition.indexOf("TOP") >= 0 ? 'top' : (options.LegendPosition.indexOf("BOTTOM") >= 0 ? 'bottom' : 'center'),
                data: colNames,
                textStyle: {
                    color: 'auto'
                },
                padding: [10, 5, options.LegendRowCount == 3 ? 30 : 8, 5]
            };

            //得到地区的经纬度，作为流向图的准确起始地点
            var geoCoord = null;
            if (options.MapType[0] == "china") {
                geoCoord = {
                    //全国主要城市的经纬度
                    '上海': [121.4648, 31.2891],
                    '东莞': [113.8953, 22.901],
                    '东营': [118.7073, 37.5513],
                    '中山': [113.4229, 22.478],
                    '临汾': [111.4783, 36.1615],
                    '临沂': [118.3118, 35.2936],
                    '丹东': [124.541, 40.4242],
                    '丽水': [119.5642, 28.1854],
                    '乌鲁木齐': [87.9236, 43.5883],
                    '佛山': [112.8955, 23.1097],
                    '保定': [115.0488, 39.0948],
                    '兰州': [103.5901, 36.3043],
                    '包头': [110.3467, 41.4899],
                    '北京': [116.4551, 40.2539],
                    '北海': [109.314, 21.6211],
                    '南京': [118.8062, 31.9208],
                    '南宁': [108.479, 23.1152],
                    '南昌': [116.0046, 28.6633],
                    '南通': [121.1023, 32.1625],
                    '厦门': [118.1689, 24.6478],
                    '台州': [121.1353, 28.6688],
                    '合肥': [117.29, 32.0581],
                    '呼和浩特': [111.4124, 40.4901],
                    '咸阳': [108.4131, 34.8706],
                    '哈尔滨': [127.9688, 45.368],
                    '唐山': [118.4766, 39.6826],
                    '嘉兴': [120.9155, 30.6354],
                    '大同': [113.7854, 39.8035],
                    '大连': [122.2229, 39.4409],
                    '天津': [117.4219, 39.4189],
                    '太原': [112.3352, 37.9413],
                    '威海': [121.9482, 37.1393],
                    '宁波': [121.5967, 29.6466],
                    '宝鸡': [107.1826, 34.3433],
                    '宿迁': [118.5535, 33.7775],
                    '常州': [119.4543, 31.5582],
                    '广州': [113.5107, 23.2196],
                    '廊坊': [116.521, 39.0509],
                    '延安': [109.1052, 36.4252],
                    '张家口': [115.1477, 40.8527],
                    '徐州': [117.5208, 34.3268],
                    '德州': [116.6858, 37.2107],
                    '惠州': [114.6204, 23.1647],
                    '成都': [103.9526, 30.7617],
                    '扬州': [119.4653, 32.8162],
                    '承德': [117.5757, 41.4075],
                    '拉萨': [91.1865, 30.1465],
                    '无锡': [120.3442, 31.5527],
                    '日照': [119.2786, 35.5023],
                    '昆明': [102.9199, 25.4663],
                    '杭州': [119.5313, 29.8773],
                    '枣庄': [117.323, 34.8926],
                    '柳州': [109.3799, 24.9774],
                    '株洲': [113.5327, 27.0319],
                    '武汉': [114.3896, 30.6628],
                    '汕头': [117.1692, 23.3405],
                    '江门': [112.6318, 22.1484],
                    '沈阳': [123.1238, 42.1216],
                    '沧州': [116.8286, 38.2104],
                    '河源': [114.917, 23.9722],
                    '泉州': [118.3228, 25.1147],
                    '泰安': [117.0264, 36.0516],
                    '泰州': [120.0586, 32.5525],
                    '济南': [117.1582, 36.8701],
                    '济宁': [116.8286, 35.3375],
                    '海口': [110.3893, 19.8516],
                    '淄博': [118.0371, 36.6064],
                    '淮安': [118.927, 33.4039],
                    '深圳': [114.5435, 22.5439],
                    '清远': [112.9175, 24.3292],
                    '温州': [120.498, 27.8119],
                    '渭南': [109.7864, 35.0299],
                    '湖州': [119.8608, 30.7782],
                    '湘潭': [112.5439, 27.7075],
                    '滨州': [117.8174, 37.4963],
                    '潍坊': [119.0918, 36.524],
                    '烟台': [120.7397, 37.5128],
                    '玉溪': [101.9312, 23.8898],
                    '珠海': [113.7305, 22.1155],
                    '盐城': [120.2234, 33.5577],
                    '盘锦': [121.9482, 41.0449],
                    '石家庄': [114.4995, 38.1006],
                    '福州': [119.4543, 25.9222],
                    '秦皇岛': [119.2126, 40.0232],
                    '绍兴': [120.564, 29.7565],
                    '聊城': [115.9167, 36.4032],
                    '肇庆': [112.1265, 23.5822],
                    '舟山': [122.2559, 30.2234],
                    '苏州': [120.6519, 31.3989],
                    '莱芜': [117.6526, 36.2714],
                    '菏泽': [115.6201, 35.2057],
                    '营口': [122.4316, 40.4297],
                    '葫芦岛': [120.1575, 40.578],
                    '衡水': [115.8838, 37.7161],
                    '衢州': [118.6853, 28.8666],
                    '西宁': [101.4038, 36.8207],
                    '西安': [109.1162, 34.2004],
                    '贵阳': [106.6992, 26.7682],
                    '连云港': [119.1248, 34.552],
                    '邢台': [114.8071, 37.2821],
                    '邯郸': [114.4775, 36.535],
                    '郑州': [113.4668, 34.6234],
                    '鄂尔多斯': [108.9734, 39.2487],
                    '重庆': [107.7539, 30.1904],
                    '金华': [120.0037, 29.1028],
                    '铜川': [109.0393, 35.1947],
                    '银川': [106.3586, 38.1775],
                    '镇江': [119.4763, 31.9702],
                    '长春': [125.8154, 44.2584],
                    '长沙': [113.0823, 28.2568],
                    '长治': [112.8625, 36.4746],
                    '阳泉': [113.4778, 38.0951],
                    '青岛': [120.4651, 36.3373],
                    '韶关': [113.7964, 24.7028],

                    //省名对应的经纬度
                    '安徽省': [117.17, 31.52],
                    '北京市': [116.24, 39.55],
                    '重庆市': [106.54, 29.59],
                    '福建省': [119.18, 26.05],
                    '甘肃省': [103.51, 36.04],
                    '广东省': [113.14, 23.08],
                    '广西省': [108.19, 22.48],
                    '贵州省': [106.42, 26.35],
                    '海南省': [110.2, 20.02],
                    '河北省': [114.3, 38.02],
                    '河南省': [113.4, 34.46],
                    '黑龙江省': [126.36, 45.44],
                    '湖北省': [114.17, 30.35],
                    '湖南省': [112.59, 28.12],
                    '吉林省': [125.19, 43.54],
                    '江苏省': [118.46, 32.03],
                    '江西省': [115.55, 28.4],
                    '辽宁省': [123.25, 41.48],
                    '内蒙古': [111.41, 40.48],
                    '宁夏': [106.16, 38.27],
                    '青海省': [101.48, 36.38],
                    '山东省': [117, 36.4],
                    '山西省': [112.33, 37.54],
                    '陕西省': [108.57, 34.17],
                    '上海市': [121.29, 31.14],
                    '四川省': [104.04, 30.4],
                    '天津市': [117.12, 39.02],
                    '西藏': [91.08, 29.39],
                    '新疆': [87.36, 43.45],
                    '云南省': [102.42, 25.04],
                    '浙江省': [120.1, 30.16],
                    '香港': [115.12, 21.23],
                    '澳门': [115.07, 21.33],
                    '台湾': [121.3, 25.03]
                };
            }
            else if (options.MapType[0] == "world") {
                geoCoord = {
                    '阿富汗': [67.709953, 33.93911],
                    '安哥拉': [17.873887, -11.202692],
                    '阿尔巴尼亚': [20.168331, 41.153332],
                    '阿联酋': [53.847818, 23.424076],
                    '阿根廷': [-63.61667199999999, -38.416097],
                    '亚美尼亚': [45.038189, 40.069099],
                    '法属南半球和南极领地': [69.348557, -49.280366],
                    '澳大利亚': [133.775136, -25.274398],
                    '奥地利': [14.550072, 47.516231],
                    '阿塞拜疆': [47.576927, 40.143105],
                    '布隆迪': [29.918886, -3.373056],
                    '比利时': [4.469936, 50.503887],
                    '贝宁': [2.315834, 9.30769],
                    '布基纳法索': [-1.561593, 12.238333],
                    '孟加拉国': [90.356331, 23.684994],
                    '保加利亚': [25.48583, 42.733883],
                    '巴哈马': [-77.39627999999999, 25.03428],
                    '波斯尼亚和黑塞哥维那': [17.679076, 43.915886],
                    '白俄罗斯': [27.953389, 53.709807],
                    '伯利兹': [-88.49765, 17.189877],
                    '百慕大': [-64.7505, 32.3078],
                    '玻利维亚': [-63.58865299999999, -16.290154],
                    '巴西': [-51.92528, -14.235004],
                    '文莱': [114.727669, 4.535277],
                    '不丹': [90.433601, 27.514162],
                    '博茨瓦纳': [24.684866, -22.328474],
                    '中非共和国': [20.939444, 6.611110999999999],
                    '加拿大': [-106.346771, 56.130366],
                    '瑞士': [8.227511999999999, 46.818188],
                    '智利': [-71.542969, -35.675147],
                    '中国': [104.195397, 35.86166],
                    '象牙海岸': [-5.547079999999999, 7.539988999999999],
                    '喀麦隆': [12.354722, 7.369721999999999],
                    '刚果民主共和国': [21.758664, -4.038333],
                    '刚果共和国': [15.827659, -0.228021],
                    '哥伦比亚': [-74.297333, 4.570868],
                    '哥斯达黎加': [-83.753428, 9.748916999999999],
                    '古巴': [-77.781167, 21.521757],
                    '北塞浦路斯': [33.429859, 35.126413],
                    '塞浦路斯': [33.429859, 35.126413],
                    '捷克共和国': [15.472962, 49.81749199999999],
                    '德国': [10.451526, 51.165691],
                    '吉布提': [42.590275, 11.825138],
                    '丹麦': [9.501785, 56.26392],
                    '多明尼加共和国': [-70.162651, 18.735693],
                    '阿尔及利亚': [1.659626, 28.033886],
                    '厄瓜多尔': [-78.18340599999999, -1.831239],
                    '埃及': [30.802498, 26.820553],
                    '厄立特里亚': [39.782334, 15.179384],
                    '西班牙': [-3.74922, 40.46366700000001],
                    '爱沙尼亚': [25.013607, 58.595272],
                    '埃塞俄比亚': [40.489673, 9.145000000000001],
                    '芬兰': [25.748151, 61.92410999999999],
                    '斐': [178.065032, -17.713371],
                    '福克兰群岛': [-59.523613, -51.796253],
                    '法国': [2.213749, 46.227638],
                    '加蓬': [11.609444, -0.803689],
                    '英国': [-3.435973, 55.378051],
                    '格鲁吉亚': [-82.9000751, 32.1656221],
                    '加纳': [-1.023194, 7.946527],
                    '几内亚': [-9.696645, 9.945587],
                    '冈比亚': [-15.310139, 13.443182],
                    '几内亚比绍': [-15.180413, 11.803749],
                    '赤道几内亚': [10.267895, 1.650801],
                    '希腊': [21.824312, 39.074208],
                    '格陵兰': [-42.604303, 71.706936],
                    '危地马拉': [-90.23075899999999, 15.783471],
                    '法属圭亚那': [-53.125782, 3.933889],
                    '圭亚那': [-58.93018, 4.860416],
                    '洪都拉斯': [-86.241905, 15.199999],
                    '克罗地亚': [15.2, 45.1],
                    '海地': [-72.285215, 18.971187],
                    '匈牙利': [19.503304, 47.162494],
                    '印尼': [113.921327, -0.789275],
                    '印度': [78.96288, 20.593684],
                    '爱尔兰': [-8.24389, 53.41291],
                    '伊朗': [53.688046, 32.427908],
                    '伊拉克': [43.679291, 33.223191],
                    '冰岛': [-19.020835, 64.963051],
                    '以色列': [34.851612, 31.046051],
                    '意大利': [12.56738, 41.87194],
                    '牙买加': [-77.297508, 18.109581],
                    '约旦': [36.238414, 30.585164],
                    '日本': [138.252924, 36.204824],
                    '哈萨克斯坦': [66.923684, 48.019573],
                    '肯尼亚': [37.906193, -0.023559],
                    '吉尔吉斯斯坦': [74.766098, 41.20438],
                    '柬埔寨': [104.990963, 12.565679],
                    '韩国': [127.766922, 35.907757],
                    '科索沃': [20.902977, 42.6026359],
                    '科威特': [47.481766, 29.31166],
                    '老挝': [102.495496, 19.85627],
                    '黎巴嫩': [35.862285, 33.854721],
                    '利比里亚': [-9.429499000000002, 6.428055],
                    '利比亚': [17.228331, 26.3351],
                    '斯里兰卡': [80.77179699999999, 7.873053999999999],
                    '莱索托': [28.233608, -29.609988],
                    '立陶宛': [23.881275, 55.169438],
                    '卢森堡': [6.129582999999999, 49.815273],
                    '拉脱维亚': [24.603189, 56.879635],
                    '摩洛哥': [-7.092619999999999, 31.791702],
                    '摩尔多瓦': [28.369885, 47.411631],
                    '马达加斯加': [46.869107, -18.766947],
                    '墨西哥': [-102.552784, 23.634501],
                    '马其顿': [21.745275, 41.608635],
                    '马里': [-3.996166, 17.570692],
                    '缅甸': [95.956223, 21.913965],
                    '黑山': [19.37439, 42.708678],
                    '蒙古': [103.846656, 46.862496],
                    '莫桑比克': [35.529562, -18.665695],
                    '毛里塔尼亚': [-10.940835, 21.00789],
                    '马拉维': [34.301525, -13.254308],
                    '马来西亚': [101.975766, 4.210484],
                    '纳米比亚': [18.49041, -22.95764],
                    '新喀里多尼亚': [165.618042, -20.904305],
                    '尼日尔': [8.081666, 17.607789],
                    '尼日利亚': [8.675277, 9.081999],
                    '尼加拉瓜': [-85.207229, 12.865416],
                    '荷兰': [5.291265999999999, 52.132633],
                    '挪威': [8.468945999999999, 60.47202399999999],
                    '尼泊尔': [84.12400799999999, 28.394857],
                    '新西兰': [174.885971, -40.900557],
                    '阿曼': [55.923255, 21.512583],
                    '巴基斯坦': [69.34511599999999, 30.375321],
                    '巴拿马': [-80.782127, 8.537981],
                    '秘鲁': [-75.015152, -9.189967],
                    '菲律宾': [121.774017, 12.879721],
                    '巴布亚新几内亚': [143.95555, -6.314992999999999],
                    '波兰': [19.145136, 51.919438],
                    '波多黎各': [-66.590149, 18.220833],
                    '北朝鲜': [127.510093, 40.339852],
                    '葡萄牙': [-8.224454, 39.39987199999999],
                    '巴拉圭': [-58.443832, -23.442503],
                    '卡塔尔': [51.183884, 25.354826],
                    '罗马尼亚': [24.96676, 45.943161],
                    '俄罗斯': [105.318756, 61.52401],
                    '卢旺达': [29.873888, -1.940278],
                    '西撒哈拉': [-12.885834, 24.215527],
                    '沙特阿拉伯': [45.079162, 23.885942],
                    '苏丹': [30.217636, 12.862807],
                    '南苏丹': [31.3069788, 6.876991899999999],
                    '塞内加尔': [-14.452362, 14.497401],
                    '所罗门群岛': [160.156194, -9.64571],
                    '塞拉利昂': [-11.779889, 8.460555],
                    '萨尔瓦多': [-88.89653, 13.794185],
                    '索马里兰': [46.8252838, 9.411743399999999],
                    '索马里': [46.199616, 5.152149],
                    '塞尔维亚共和国': [21.005859, 44.016521],
                    '苏里南': [-56.027783, 3.919305],
                    '斯洛伐克': [19.699024, 48.669026],
                    '斯洛文尼亚': [14.995463, 46.151241],
                    '瑞典': [18.643501, 60.12816100000001],
                    '斯威士兰': [31.465866, -26.522503],
                    '叙利亚': [38.996815, 34.80207499999999],
                    '乍得': [18.732207, 15.454166],
                    '多哥': [0.824782, 8.619543],
                    '泰国': [100.992541, 15.870032],
                    '塔吉克斯坦': [71.276093, 38.861034],
                    '土库曼斯坦': [59.556278, 38.969719],
                    '东帝汶': [125.727539, -8.874217],
                    '特里尼达和多巴哥': [-61.222503, 10.691803],
                    '突尼斯': [9.537499, 33.886917],
                    '土耳其': [35.243322, 38.963745],
                    '坦桑尼亚联合共和国': [34.888822, -6.369028],
                    '乌干达': [32.290275, 1.373333],
                    '乌克兰': [31.16558, 48.379433],
                    '乌拉圭': [-55.765835, -32.522779],
                    '美国': [-95.712891, 37.09024],
                    '乌兹别克斯坦': [64.585262, 41.377491],
                    '委内瑞拉': [-66.58973, 6.42375],
                    '越南': [108.277199, 14.058324],
                    '瓦努阿图': [166.959158, -15.376706],
                    '西岸': [35.3027226, 31.9465703],
                    '也门': [48.516388, 15.552727],
                    '南非': [22.937506, -30.559482],
                    '赞比亚': [27.849332, -13.133897],
                    '津巴布韦': [29.154857, -19.015438],

                    '江苏省': [118.46, 32.03]
                };
            }

            seriesData.push({
                name: options.MapType[0],
                type: 'map',
                roam: false,
                hoverable: false,
                mapType: options.MapType[0],
                itemStyle: {
                    normal: {
                        borderColor: 'rgba(100,149,237,1)',
                        borderWidth: 1,
                        areaStyle: {
                            color: options.BgColor
                        }
                    }
                },
                data: [],
                markLine: {
                    smooth: true,
                    symbol: ['none', 'circle'],
                    symbolSize: 1,
                    itemStyle: {
                        normal: {
                            //color: '#fff',
                            borderWidth: 1,
                            borderColor: 'rgba(30,144,255,0.5)'
                        }
                    },
                    data: []
                },
                geoCoord: geoCoord
            });

            var yColIndex = yIsNull ? 1 : options.YDataColIndex;

            for (var i = 0; i < xData.length; i++) {
                var yDataLine = [];
                var yDataPoint = [];

                for (var r = 0; r < dataSource.rows.length; r++) {
                    if (dataSource.rows[r]['col' + (options.ChartType == "MapFlowIn" ? x2 : x1)] == xData[i]) {
                        yDataLine.push([{ name: dataSource.rows[r]['col' + x1] }, { name: dataSource.rows[r]['col' + x2], value: dataSource.rows[r]['col' + yColIndex] }]);
                        yDataPoint.push({ name: dataSource.rows[r]['col' + (options.ChartType == "MapFlowIn" ? x1 : x2)], value: dataSource.rows[r]['col' + yColIndex] });
                    }
                }

                seriesData.push({
                    name: xData[i],
                    type: 'map',
                    mapType: options.MapType[0],
                    data: [],
                    markLine: {
                        smooth: true,
                        effect: {
                            show: true,
                            scaleSize: 1,
                            period: 30,
                            color: '#fff',
                            shadowBlur: 10
                        },
                        itemStyle: {
                            normal: {
                                borderWidth: 1,
                                label: {
                                    show: true,
                                    position: options.ChartType == "MapFlowIn" ? 'start' : 'end'//流入时显示在起点，流出时显示在终点
                                },
                                lineStyle: {
                                    type: 'solid',
                                    shadowBlur: 10
                                }
                            }
                        },
                        data: yDataLine
                    },
                    markPoint: {
                        symbol: 'emptyCircle',
                        symbolSize: function (v) {
                            var tmpMin = Math.ceil(options.DataSource.rows[maxMin.minrow]['col' + yColIndex])
                            if (tmpMin < 10) {
                                return 10 + v / 10
                            }
                            else {
                                return 10 + v / tmpMin
                            }
                        },
                        effect: {
                            show: true,
                            shadowBlur: 0
                        },
                        itemStyle: {
                            normal: {
                                label: { show: false }
                            },
                            emphasis: {
                                label: { position: 'top' }
                            }
                        },
                        data: yDataPoint
                    }
                });
            }
        }
        else if (chartType == "MapScatter") {
            //获得legend的数据源
            var x0 = options.XDataColIndex.split(',')[0];
            var xStr = "";
            var x0Str = "";

            for (var r = 0; r < dataSource.rows.length; r++) {
                x0Str = dataSource.rows[r]['col' + x0];
                if (xStr.indexOf(x0Str) < 0) {
                    xStr += x0Str + ",";
                }
            }

            xData = xStr.substr(0, xStr.length - 1).split(',');
            colNames = xData;//legend的数据源

            legend = {
                show: options.IsShowLegend,
                orient: (options.LegendPosition.indexOf("RIGHT") >= 0 || options.LegendPosition.indexOf("LEFT") >= 0) ? 'vertical' : 'horizontal',
                x: options.LegendPosition.indexOf("RIGHT") >= 0 ? 'right' : (options.LegendPosition.indexOf("LEFT") >= 0 ? 'left' : 'center'),
                y: options.LegendPosition.indexOf("TOP") >= 0 ? 'top' : (options.LegendPosition.indexOf("BOTTOM") >= 0 ? 'bottom' : 'center'),
                data: colNames,
                textStyle: {
                    color: 'auto'
                },
                padding: [10, 5, options.LegendRowCount == 3 ? 30 : 8, 5]
            };

            var x1 = options.XDataColIndex.split(',')[1];//markPoint的data的name
            var x2 = options.XDataColIndex.split(',')[2];//经度
            var x3 = options.XDataColIndex.split(',')[3];//纬度

            var yColIndex = yIsNull ? 1 : options.YDataColIndex;

            for (var i = 0; i < xData.length; i++) {
                var yDataPoint = [];

                for (var r = 0; r < dataSource.rows.length; r++) {
                    if (dataSource.rows[r]['col' + x0] == xData[i]) {
                        yDataPoint.push({
                            name: dataSource.rows[r]['col' + x1],
                            value: dataSource.rows[r]['col' + yColIndex],
                            geoCoord: [dataSource.rows[r]['col' + x2], dataSource.rows[r]['col' + x3]]
                        });
                    }
                }

                seriesData.push({
                    name: xData[i],
                    type: 'map',
                    mapType: options.MapType[0],
                    itemStyle: {
                        normal: {
                            borderColor: 'rgba(100,149,237,1)',
                            borderWidth: 1.5,
                            areaStyle: {
                                color: options.BgColor
                            }
                        }
                    },
                    hoverable: false,
                    roam: false,
                    data: [],
                    markPoint: {
                        symbolSize: 2,
                        large: true,
                        effect: {
                            show: true
                        },
                        data: yDataPoint
                    }
                });
            }
        }
        else if (chartType == "gauge") {//仪表盘

            //根据当前div的高度自动改变某些属性
            var axisLine_lineStyle_width = 8;//圆环线的宽度
            var axisTick_splitNumber = 10;//小刻度分割的段数
            var axisTick_length = 12;//小刻度分隔线的长度
            var axisLabel_textStyle_fontSize = 9;//大刻度字体大小
            var splitLine_length = 30;//大刻度分隔线的长度
            var pointer_width = 5;//指针的宽度
            var title_textStyle_fontSize = 12;//标题字体的大小
            var detail_textStyle_fontSize = 14;//值的字体大小

            if (options.DivHeight <= 140) {
                axisLine_lineStyle_width = 2;//圆环线的宽度
                axisTick_splitNumber = 5;//小刻度分割的段数
                axisTick_length = 6;//小刻度分隔线的长度
                axisLabel_textStyle_fontSize = 9;//大刻度字体大小
                splitLine_length = 8;//大刻度分隔线的长度
                pointer_width = 3;//指针的宽度
                title_textStyle_fontSize = 10;//标题字体的大小
                detail_textStyle_fontSize = 12;//值的字体大小
            }
            else if (options.DivHeight > 140 && options.DivHeight <= 220) {
                axisLine_lineStyle_width = 4;//圆环线的宽度
                axisTick_splitNumber = 5;//小刻度分割的段数
                axisTick_length = 8;//小刻度分隔线的长度
                axisLabel_textStyle_fontSize = 9;//大刻度字体大小
                splitLine_length = 10;//大刻度分隔线的长度
                pointer_width = 3;//指针的宽度
                title_textStyle_fontSize = 12;//标题字体的大小
                detail_textStyle_fontSize = 14;//值的字体大小
            }
            else if (options.DivHeight > 220 && options.DivHeight <= 270) {
                axisLine_lineStyle_width = 5;//圆环线的宽度
                axisTick_splitNumber = 10;//小刻度分割的段数
                axisTick_length = 10;//小刻度分隔线的长度
                axisLabel_textStyle_fontSize = 11;//大刻度字体大小
                splitLine_length = 20;//大刻度分隔线的长度
                pointer_width = 5;//指针的宽度
                title_textStyle_fontSize = 16;//标题字体的大小
                detail_textStyle_fontSize = 18;//值的字体大小
            }
            else if (options.DivHeight > 270) {
                axisLine_lineStyle_width = 6;//圆环线的宽度
                axisTick_splitNumber = 10;//小刻度分割的段数
                axisTick_length = 11;//小刻度分隔线的长度
                axisLabel_textStyle_fontSize = 12;//大刻度字体大小
                splitLine_length = 25;//大刻度分隔线的长度
                pointer_width = 5;//指针的宽度
                title_textStyle_fontSize = 16;//标题字体的大小
                detail_textStyle_fontSize = 20;//值的字体大小
            }
            //悬浮框样式
            tooltip = {
                formatter: "{b}<br/>{c}"
            };
            colNames = options.Title;//图例名

            if (!isNullProperty(options.YDataColIndex)) {
                if (options.DataSource.rows.length > 0) {
                    options.GaugeValue = options.DataSource.rows[0]['col' + options.YDataColIndex];
                    options.GaugeName = options.DataSource.colnames[options.YDataColIndex];
                }
            }

            if (isNullProperty(options.YMaxValue)) {
                options.YMaxValue = Math.ceil(parseFloat(options.GaugeValue) * 1.2);
            }
            var splitNum = options.GaugeSplitColor.length
            if (splitNum > 0) {
                if (isNullProperty(options.YMaxValue)) {
                    var tmpSplitValue = parseFloat(options.GaugeSplitColor[splitNum - 2][0]);
                    if (parseFloat(options.GaugeValue) < tmpSplitValue) {
                        options.YMaxValue = parseInt(tmpSplitValue * 1.2);
                    }
                }
                for (var i = 0; i < splitNum; i++) {

                }
            }

            seriesData.push({
                name: options.Title,
                type: chartType,
                min: isNullProperty(options.YMinValue) ? 0 : options.YMinValue,
                max: isNullProperty(options.YMaxValue) ? 100 : options.YMaxValue,
                splitNumber: options.GaugeSplitNumber,       // 分割段数，默认为5 大刻度分割的段数
                axisLine: {            // 坐标轴线
                    lineStyle: {       // 属性lineStyle控制线条样式
                        color: options.GaugeColor,//样例：[[0.2, '#ff4500'], [0.8, '#48b'], [1, '#228b22']]
                        width: axisLine_lineStyle_width//圆环线的宽度
                    }
                },
                axisTick: {            // 坐标轴小标记
                    splitNumber: axisTick_splitNumber,   // 每份split细分多少段 小刻度分割的段数
                    length: axisTick_length,        // 属性length控制线长 小刻度分隔线的长度
                    lineStyle: {       // 属性lineStyle控制线条样式
                        color: 'auto'
                    }
                },
                axisLabel: {           // 坐标轴文本标签，详见axis.axisLabel
                    textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                        color: 'auto',
                        fontSize: axisLabel_textStyle_fontSize//大刻度字体大小
                    },
                    formatter: function (v) {
                        return v.toFixed(0);
                    }
                },
                splitLine: {           // 分隔线
                    show: true,        // 默认显示，属性show控制显示与否
                    length: splitLine_length,         // 属性length控制线长 大刻度分隔线的长度
                    lineStyle: {       // 属性lineStyle（详见lineStyle）控制线条样式
                        color: 'auto'
                    }
                },
                pointer: {
                    width: pointer_width//指针宽度
                },
                title: {
                    show: true,
                    offsetCenter: [0, '110%'],       // x, y，单位px
                    textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                        fontWeight: 'bolder',
                        fontSize: title_textStyle_fontSize//标题的大小
                    }
                },
                detail: {
                    formatter: '{value}',
                    textStyle: {       // 其余属性默认使用全局文本样式，详见TEXTSTYLE
                        color: 'auto',
                        fontWeight: 'bolder',
                        fontSize: detail_textStyle_fontSize//值的字体大小
                    }
                },
                data: [{ value: options.GaugeValue, name: options.GaugeName }]
            });
        }
        //==============得到echartsOptions的元素series的值（seriesData），及legend中的data值（colNames）============== end

        if (chartType != "map" && chartType != "MapFlowOut" && chartType != "MapFlowIn" && chartType != "MapScatter") {
            if (chartType == "pie" && options.ChartType == "PieLayered") {
                legend = {
                    show: options.IsShowLegend,
                    orient: 'vertical',
                    x: options.DivWidth / 2,
                    y: 12,
                    itemGap: 12,
                    textStyle: {
                        fontSize: 11
                    },
                    formatter: function (value) {
                        if (value.length > 12) {
                            value = value.substr(0, 12) + "\n" + value.substr(12);
                        }
                        return value;
                    },
                    data: colNames
                };
            }
            else if (chartType == "treemap" || chartType == "gauge") {
                legend = null;
            }
            else {
                legend = {//---图例
                    show: options.IsShowLegend,
                    orient: (options.LegendPosition.indexOf("RIGHT") >= 0 || options.LegendPosition.indexOf("LEFT") >= 0) ? 'vertical' : 'horizontal',
                    x: options.LegendPosition.indexOf("RIGHT") >= 0 ? 'right' : (options.LegendPosition.indexOf("LEFT") >= 0 ? 'left' : 'center'),
                    y: options.LegendPosition.indexOf("TOP") >= 0 ? 'top' : (options.LegendPosition.indexOf("BOTTOM") >= 0 ? 'bottom' : 'center'),
                    padding: [0, 5, options.LegendRowCount == 3 ? 30 : 8, 5],
                    formatter: function (value) {
                        if (options.LegendIsTrim && !isNullProperty(value) && value.length > options.LegendTrimNum) {
                            value = value.substr(0, options.LegendTrimNum) + "...";
                        }
                        return value;
                    },
                    textStyle: {
                        fontSize: options.FontSize
                    },
                    itemWidth: options.FontSize < 9 ? 10 : 20,
                    itemHeight: options.FontSize < 9 ? 7 : 14,
                    data: colNames
                    //示例：
                    //data: ['蒸发量', '降水量']
                };

                //指标过多的情况下，可以将某些指标先隐藏，表现为图例中对应的项为灰色，点击之后可恢复显示，饼图暂时不支持
                if (options.LegendNotSelected.length > 0) {
                    var indexs = options.LegendNotSelected.split(',');
                    var selected = "{";
                    for (var i = 0; i < indexs.length; i++) {
                        selected += "'" + options.DataSource.colnames[indexs[i]] + "':false,";
                    }
                    selected = selected.substr(0, selected.length - 1);
                    selected += "}";
                    selected = eval("(" + selected + ")");
                }
                $.extend(true, legend, { selected: selected });
            }
        }

        //echarts的options
        var echartsOptions = {
            color: options.ColorArr,//可以手动指定图例、指标的颜色，覆盖主题色系
            theme: options.Theme,
            //renderAsImage:true,//非IE8-支持渲染为图片
            backgroundColor: options.BgColor == "" ? "" : options.BgColor,
            noDataLoadingOption: {
                text: "无数据",
                effect: 'whirling',//spin空白、bar长条、ring圆环、dynamicLine很多线、bubble气泡、whirling指针旋转
                effectOption: {
                    backgroundColor: '#fff'
                }
            },
            title: {
                show: true,
                x: options.TitlePositionX,
                y: options.TitlePositionY,
                text: options.Title,
                textStyle: {
                    fontSize: 13
                },
                subtext: options.SubTitle
            },
            animation: options.IsFlash,
            //工具栏
            toolbox: {
                show: options.Toolbox.show,
                feature: {
                    saveAsImage: { show: true }
                }
            },
            //悬浮框
            tooltip: tooltip,
            grid: grid,
            //图例
            legend: legend,
            //是否启用拖拽重计算特性，默认关闭，false时就无法拖拽
            calculable: calculable,
            //数据过多时增加滚动条及缩放功能   
            dataZoom: dataZoom,
            ////雷达图用到此属性
            //polar: [{ indicator: indicator }],
            //示例：
            //polar: [
            //         {
            //             indicator: [
            //                 { text: '销售（sales）', max: 6000 },
            //                 { text: '管理（Administration）', max: 16000 },
            //                 { text: '信息技术（Information Techology）', max: 30000 },
            //                 { text: '客服（Customer Support）', max: 38000 },
            //                 { text: '研发（Development）', max: 52000 },
            //                 { text: '市场（Marketing）', max: 25000 }
            //             ]
            //         }
            //],
            //地图中用到
            dataRange: dataRange,
            series: seriesData
            //示例：
            //series: 
            //[
            //{
            //    name: '蒸发量',
            //    type: 'bar',
            //    data: [2.0, 4.9, 7.0, 23.2, 25.6, 76.7, 135.6, 162.2, 32.6, 20.0, 6.4, 3.3],
            //    markPoint: {
            //        data: [
            //            { type: 'max', name: '最大值' },
            //            { type: 'min', name: '最小值' }
            //        ]
            //    },
            //    markLine: {
            //        data: [
            //            { type: 'average', name: '平均值' }
            //        ]
            //    }
            //},
            //{
            //    name: '降水量',
            //    type: 'bar',
            //    data: [2.6, 5.9, 9.0, 26.4, 28.7, 70.7, 175.6, 182.2, 48.7, 18.8, 6.0, 2.3],
            //    markPoint: {
            //        data: [
            //            { name: '年最高', value: 182.2, xAxis: 7, yAxis: 183, symbolSize: 18 },
            //            { name: '年最低', value: 2.3, xAxis: 11, yAxis: 3 }
            //        ]
            //    },
            //    markLine: {
            //        data: [
            //            { type: 'average', name: '平均值' }
            //        ]
            //    }
            //}
            //]
        };

        //雷达图用到此属性
        if (chartType == "radar") {
            $.extend(true, echartsOptions, { polar: [{ indicator: indicator }] });
        }

        //==============处理坐标轴============== begin

        ////x坐标轴
        //var xLabelStep = options.XLabelStep;

        ////折线图x轴数量超过8个时采用间隔显示的方式
        //if (options.ChartType == "Line" && xLabelStep == 1 && xData.length > 3) {
        //    xLabelStep = Math.round(xData.length / 3) + 1;
        //}

        var xAxisItems = [];
        if (chartType != "scatter") {
            var xAxisItems1 = {
                type: 'category',
                show: options.IsShowX,
                name: options.XTitle,
                axisLine: {
                    onZero: false//true表示：有负值时坐标线定位到垂直方向的0值坐标上 
                },
                axisLabel: {
                    show: options.IsShowLabel,//是否显示此坐标轴的值
                    interval: options.XLabelStep == 1 ? (options.ChartType == "Line" ? 'auto' : 0) : options.XLabelStep - 1,//值间隔，0表示全部显示
                    rotate: options.XLabelStyle == "Rotate" ? 45 : 0,//倾斜角度
                    formatter: function (value) {
                        if (options.XIsTrim && !isNullProperty(value) && value.length > options.XTrimNum) {
                            value = value.substr(0, options.XTrimNum) + "...";
                        }

                        if (options.XLabelStyle == "Wrap") {
                            var xFontNum = Math.floor((options.DivWidth - 70) / options.DataSource.rows.length / 12) + 1;
                            if (!isNullProperty(options.XLabelStep)) {
                                xFontNum = Math.floor((options.DivWidth - 70) / (options.DataSource.rows.length / (options.XLabelStep + 1)) / 12) + 1;
                            }
                            var newValue = "";
                            if (value.length > xFontNum) {
                                var num = Math.ceil(value.length / xFontNum);
                                for (var i = 0; i < num; i++) {
                                    newValue += value.substr(i * xFontNum, xFontNum) + "\n";
                                }
                                value = newValue;
                            }
                        }

                        return value;
                    },
                    textStyle: {
                        color: options.Theme == "dark" ? '#ffffff' : '#000000',
                        //fontSize: options.FontSize//字体大小
                        fontSize: options.XLabelStyle == "Rotate" && isNullProperty(options.XLabelStep) ? (Math.floor((options.DivWidth - 70) / options.DataSource.rows.length / 1.5) > 12 ? 12 : Math.floor((options.DivWidth - 70) / options.DataSource.rows.length / 1.5)) : options.FontSize//自动计算字体大小
                    }
                },
                data: xData
                //示例：
                //['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
            };

            //为彩虹柱图时处理X轴
            if (options.ChartType == "ColumnRainbow") {
                $.extend(true, xAxisItems1, {
                    show: true,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    splitLine: { show: false }
                });
            }

            xAxisItems.push(xAxisItems1);
        }

        //y坐标轴
        var yAxisItems = [];
        if (!y2IsNull) {//双y轴
            var y1AxisItems = {
                type: 'value',
                show: options.IsShowY,
                name: options.YTitle,
                scale: options.IsAutoLimits,//脱离0值比例，放大聚焦到最终_min，_max区间 
                //precision: 2,//小数位数
                splitLine: {
                    show: options.Theme == "dark" ? false : true,
                    lineStyle: {       // 属性lineStyle控制线条样式
                        color: '#C2C2C2'
                    }
                },//分隔线，默认显示
                splitArea: {
                    show: options.Theme == "dark" ? false : true,
                    areaStyle: {
                        color: ['rgba(255,255,255,0.5)', 'rgba(247,247,247,0.5)']
                    }
                },//分隔区域，默认显示
                axisLabel: {
                    formatter: function (v) {
                        return axisFormatter(v, options.YFormatType, options.YUnit, options.YDecimals);
                    },
                    interval: options.YLabelStep == "" ? 0 : options.YLabelStep - 1,//值间隔，0表示全部显示
                    rotate: options.YLabelStyle == "Rotate" ? 45 : 0,//倾斜角度
                    textStyle: {
                        color: options.Theme == "dark" ? '#ffffff' : '#000000',
                        fontSize: options.FontSize//字体大小
                    }
                }
                //,
                //min: isNullProperty(options.YMinValue) ? null : options.YMinValue
            };
            if (!isNullProperty(options.YMaxValue)) {
                var maxValue = { max: options.YMaxValue };
                $.extend(true, y1AxisItems, maxValue);
            }
            var y2AxisItems = {
                type: 'value',
                show: options.IsShowY2,
                name: options.Y2Title,
                scale: options.IsAutoLimits,//脱离0值比例，放大聚焦到最终_min，_max区间 
                //precision: 2,//小数位数
                splitNumber: options.Y2SplitNumber,//分割段数
                splitLine: {
                    show: false,
                    lineStyle: {       // 属性lineStyle控制线条样式
                        color: '#C2C2C2'
                    }
                },//分隔线，默认不显示
                splitArea: {
                    show: false,
                    areaStyle: {
                        color: ['rgba(255,255,255,0.5)', 'rgba(247,247,247,0.5)']
                    }
                },//分隔区域，默认不显示
                axisLabel: {
                    formatter: function (v) {
                        return axisFormatter(v, options.Y2FormatType, options.Y2Unit, options.Y2Decimals);
                    },
                    interval: options.Y2LabelStep == "" ? 0 : options.Y2LabelStep - 1,//值间隔，0表示全部显示
                    rotate: options.Y2LabelStyle == "Rotate" ? 45 : 0,//倾斜角度
                    textStyle: {
                        color: options.Theme == "dark" ? '#ffffff' : '#000000',
                        fontSize: options.FontSize//字体大小
                    }
                }
                //,
                //min: isNullProperty(options.Y2MinValue) ? null : options.Y2MinValue
            };
            if (!isNullProperty(options.Y2MaxValue)) {
                var maxValue = { max: options.Y2MaxValue };
                $.extend(true, y2AxisItems, maxValue);
            }

            if (chartType == "scatter") {
                if (isNullProperty(options.Y2DataColIndex)) {//如果Y2轴未指定，则全部用Y1轴参数
                    yAxisItems.push(y1AxisItems);
                    xAxisItems.push(y1AxisItems);
                }
                else {
                    $.extend(true, y2AxisItems, {
                        splitLine: { show: true },//分隔线
                        splitArea: { show: true }//分隔区域
                    });
                    yAxisItems.push(y2AxisItems);
                    xAxisItems.push(y1AxisItems);
                }
            }
            else {
                yAxisItems.push(y1AxisItems);
                yAxisItems.push(y2AxisItems);
            }
        }
        else {
            var y1AxisItems = {
                type: 'value',
                show: options.IsShowY,
                name: options.YTitle,
                position: 'left',
                scale: options.IsAutoLimits,//脱离0值比例，放大聚焦到最终_min，_max区间 
                //precision: 2,//小数位数
                splitNumber: options.YSplitNumber,//分割段数
                splitLine: {
                    show: options.Theme == "dark" ? false : (options.IsAlign == true ? false : true),
                    lineStyle: {       // 属性lineStyle控制线条样式
                        color: '#C2C2C2'
                    }
                },//分隔线，默认显示
                splitArea: {
                    show: options.Theme == "dark" ? false : (options.IsAlign == true ? false : true),
                    areaStyle: {
                        color: ['rgba(255,255,255,0.5)', 'rgba(247,247,247,0.5)']
                    }
                },//分隔区域，默认不显示
                axisLabel: {
                    show: options.IsAlign == true ? false : true,
                    formatter: function (v) {
                        return axisFormatter(v, options.YFormatType, options.YUnit, options.YDecimals);
                    },
                    interval: options.YLabelStep == "" ? 0 : options.YLabelStep - 1,//值间隔，0表示全部显示
                    rotate: options.YLabelStyle == "Rotate" ? 45 : 0,//倾斜角度
                    textStyle: {
                        color: options.Theme == "dark" ? '#ffffff' : '#000000',
                        fontSize: options.FontSize//字体大小
                    }
                }
                //,
                //min: isNullProperty(options.YMinValue) ? null : options.YMinValue
            };
            if (!isNullProperty(options.YMaxValue)) {
                var maxValue = { max: options.YMaxValue };
                $.extend(true, y1AxisItems, maxValue);
            }
            yAxisItems.push(y1AxisItems);
        }

        var echartsOptionsAxis = {
            //---为echartsOptions的元素，x坐标轴
            xAxis: xAxisItems,
            //---为echartsOptions的元素，y坐标轴
            yAxis: yAxisItems
            //示例：
            //yAxis: [
            //    {
            //        type: 'value',
            //        min: (options.YMinValue == "" || options.YMinValue == null) ? 0 : options.YMinValue
            //        //,
            //        //max: options.YMaxValue == "" ? null : options.YMaxValue  //?
            //    }
            //]
        };

        //长条图或堆叠长条图时x轴与y轴互换
        if (options.ChartType == "Bar" || options.ChartType == "StackedBar") {
            var temp = echartsOptionsAxis.xAxis;
            echartsOptionsAxis.xAxis = echartsOptionsAxis.yAxis;
            echartsOptionsAxis.yAxis = temp;
        }

        //图表类型包含柱图、折线图、散点图时才用到坐标轴
        if (chartType == "bar" || chartType == "line" || chartType == "scatter") {
            $.extend(true, echartsOptions, echartsOptionsAxis);
        }

        //==============处理坐标轴============== end

        return echartsOptions;
    }

    //echarts新增，格式化值的样式，可以是坐标轴刻度值、内容(Label)的值、悬浮框(tooltip)的值
    function axisFormatter(value, type, unit, decimal) {//type为1000、1024、%三种，unit为单位，decimal为小数位
        //var formatValue1000 = "10000,100,10,10";
        //var formatUnit1000 = "万,百万,千万,亿";
        //var formatValue1024 = "1024,1024,1024,1024";
        //var formatUnit1024 = "KB,MB,GB,TB";

        if (isNullProperty(unit)) {
            unit = "";
        }

        if (type == "%") {
            return (value * 100).toFixed(decimal) + "%"
        }
        else if (type == "1000") {
            var vLength = Math.round(value).toString().length;
            if (vLength >= 5 && vLength < 7) {
                return (value / 10000).toFixed(decimal) + "万" + unit;
            }
            else if (vLength == 7) {
                return (value / 1000000).toFixed(decimal) + "百万" + unit;
            }
            else if (vLength == 8) {
                return (value / 10000000).toFixed(decimal) + "千万" + unit;
            }
            else if (vLength >= 9) {
                return (value / 100000000).toFixed(decimal) + "亿" + unit;
            }
            else {
                return value + unit;
            }
        }
            //else if (type == "1000") {
            //    var vLength = Math.round(value).toString().length;
            //    if (vLength >= 5 && vLength < 7) {
            //        return Math.round(value / 10000) + "万";
            //    }
            //    else if (vLength == 7) {
            //        return Math.round(value / 1000000) + "百万";
            //    }
            //    else if (vLength == 8) {
            //        return Math.round(value / 10000000) + "千万";
            //    }
            //    else if (vLength >= 9) {
            //        return Math.round(value / 100000000) + "亿";
            //    }
            //    else {
            //        return value;
            //    }
            //}
        else if (type == "1024") {
            switch (unit.toUpperCase()) {
                case "TB": value = value * 1024 * 1024 * 1024 * 1024; break;
                case "GB": value = value * 1024 * 1024 * 1024; break;
                case "MB": value = value * 1024 * 1024; break;
                case "KB": value = value * 1024; break;
                default: break;
            }

            var v = value;

            if ((v = parseFloat((value / 1024 / 1024 / 1024 / 1024))) >= 1) {
                return v.toFixed(decimal) + "TB";
            }
            else if ((v = parseFloat((value / 1024 / 1024 / 1024))) >= 1) {
                return v.toFixed(decimal) + "GB";
            }
            else if ((v = parseFloat((value / 1024 / 1024))) >= 1) {
                return v.toFixed(decimal) + "MB";
            }
            else if ((v = parseFloat((value / 1024))) >= 1) {
                return v.toFixed(decimal) + "KB";
            }
            else {
                return v;
            }
        }
        else {
            return value + unit;
        }
    }

    //获取图形类型
    function getChartType(type) {
        var chartType = "bar";
        switch (type) {
            case "Column": chartType = "bar"; break;
            case "StackedColumn": chartType = "bar"; break;
            case "Bar": chartType = "bar"; break;
            case "StackedBar": chartType = "bar"; break;
            case "Radar": chartType = "radar"; break;
            case "Line": chartType = "line"; break;
            case "Area": chartType = "line"; break;
            case "StackedArea": chartType = "line"; break;
            case "Pie": chartType = "pie"; break;
            case "Doughnut": chartType = "pie"; break;
            case "ScrollColumn": chartType = "bar"; break;
            case "ScrollLine": chartType = "line"; break;
            case "ScrollArea": chartType = "line"; break;
            case "ScrollStackedColumn": chartType = "bar"; break;
            case "Combi1": chartType = "bar"; break;
            case "Combi2": chartType = "bar"; break;
            case "Combi3": chartType = "bar"; break;
            case "Combi1Y": chartType = "bar"; break;
            case "Combi2Y": chartType = "bar"; break;
            case "Combi3Y": chartType = "bar"; break;

                //Echarts新增的类型
            case "Gauge": chartType = "gauge"; break;
            case "Map": chartType = "map"; break;
            case "Scatter": chartType = "scatter"; break;
            case "Bubble": chartType = "scatter"; break;
            case "Tree": chartType = "tree"; break;

            case "ColumnWaterfall": chartType = "bar"; break;//瀑布图
            case "ColumnRainbow": chartType = "bar"; break;//彩虹柱图
            case "PieRose": chartType = "pie"; break;//南丁格尔玫瑰图
            case "PieLayered": chartType = "pie"; break;//分层饼图
            case "PieDoughnut": chartType = "PieDoughnut"; break;//嵌套饼图
            case "MapFlowOut": chartType = "MapFlowOut"; break;//流出型地图
            case "MapFlowIn": chartType = "MapFlowIn"; break;//流入型地图
            case "MapScatter": chartType = "MapScatter"; break;//散点地图

            default: type == "" ? chartType = "bar" : chartType = type; break;
        }
        return chartType;
    }

    //改用echarts后有用到
    function existArr(arr, val) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == val) {
                return i;
            }
        }
        return -1;
    }

    function getColMaxMin(rows, colindex) {
        if (rows.length <= 0) {
            return null;
        }
        var max = rows[0]["col" + colindex];
        var min = rows[0]["col" + colindex];
        var maxRowIndex = 0;
        var minRowIndex = 0;
        for (var i = 1; i < rows.length; i++) {
            var val = rows[i]["col" + colindex];
            if ((val - 0) > (max - 0)) {
                max = val;
                maxRowIndex = i;
            }
            if ((val - 0) < (min - 0)) {
                min = val;
                minRowIndex = i;
            }
        }
        if (maxRowIndex >= 0 && minRowIndex >= 0) {
            return { maxrow: maxRowIndex, minrow: minRowIndex, colindex: colindex };
        }
        else {
            return null;
        }
    }

    //获取高亮显示用的颜色
    function getHightlightColor(index, isY) {
        return "008800"; // "FFFF33";
    }

    //判断值是否为空
    function isNullProperty(p) {
        if (p == undefined || p == null || (typeof (p) == "string" && p == "")) {
            return true;
        }
        else {
            return false;
        }
    }

    //获得根路径
    function getRootPath() {
        var strFullPath = window.document.location.href;
        var strPath = window.document.location.pathname;
        var pos = strFullPath.indexOf(strPath);
        var prePath = strFullPath.substring(0, pos);
        //var postPath = strPath.substring(0, strPath.substr(1).indexOf('/') + 1);
        //return (prePath + postPath);
        return prePath;
    }

})(jQuery);