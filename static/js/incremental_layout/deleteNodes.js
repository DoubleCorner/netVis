/**
 * Created by zhangye on 2018/11/16.
 */
function deleteNodes(layoutNodes, nowData) {
     var nowDataDict =  countLinks(nowData);

     var layoutNodesCopy = [];
     var layoutNodes1 = [].concat(layoutNodes);
    // console.log(layoutNodes1);
    layoutNodes1.forEach(function(d){
          if(nowDataDict[d.id]){
              d.links = nowDataDict[d.id];
              d.degree = nowDataDict[d.id].length;
              d.subs = layoutNodesCopy.length;
              layoutNodesCopy.push(d);
          }
     })
    // console.log([].concat(layoutNodesCopy));

    return layoutNodesCopy;
}
function countLinks(data) {
    var nodedict = {};
    data.forEach(function(d) {
        if(nodedict[d.source]) {
            nodedict[d.source].push(d.target);
        } else {
            nodedict[d.source] = [];
            nodedict[d.source].push(d.target);
        }

        if(nodedict[d.target]) {
            nodedict[d.target].push(d.source)
        } else {
            nodedict[d.target] = [];
            nodedict[d.target].push(d.source);
        }
    })
    return nodedict;
}
// function deepCopy(arr) {
//     var str = JSON.stringify(arr);
//     var copy = JSON.parse(str);
//     return copy;
// }
