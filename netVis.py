# coding=utf-8
import json
import calNetwork
from flask import Flask, request
from flask import render_template, jsonify
from igraph import *
import re
import codecs

upload_file_index = 0
upload_path = ''  # 保存每次上传数据后的地址，保证上传后 文件不会丢失

app = Flask(__name__)

# 保存的格式和标准格式区别较大  将其转变为标准格式


def chang_data(res):
    result = {'links': [], 'nodes': []}
    nodes = []  # 取出节点
    node = []
    for val in res['nodes']:
        nodes.append({
            "opacity": val['opacity'],
            "level": val['level'],
            "color": val['color'],
            "continuous": val['continuous'],
            "port": val['port'],
            "discrete": val['discrete'],
            "stroke": val['stroke'],
            "id": val['id'],
            "size": val['size']
        })
        node.append(val['id'])
    result['nodes'] = nodes
    links = []
    if (isinstance(res['links'][0]['source'], dict)):
        for val in res['links']:
            if (val['target']['id'] in node and val['source']['id'] in node):
                links.append({
                    "opacity": val['opacity'],
                    "target": val['target']['id'],
                    "weight": val['weight'],
                    "discrete": val['discrete'],
                    "color": val['color'],
                    "continuous": val['continuous'],
                    "source": val['source']['id'],
                    "id": val['id']
                })
    else:
        for val in res['links']:
            # 保证source 和 target都在nodes里面
            if (val['source'] in node and val['target'] in node):
                links.append({
                    "opacity": val['opacity'],
                    "target": val['target'],
                    "weight": val['weight'],
                    "discrete": val['discrete'],
                    "color": val['color'],
                    "continuous": val['continuous'],
                    "source": val['source'],
                    "id": val['id']
                })
    result['links'] = links
    return result


# 计算布局数据


def cal_back_layout_data(result, layout_type):
    if layout_type == 'force' or layout_type == 'bundle' or layout_type == 'incremental':
        return False
    nodes = []
    links = []
    for node in result['nodes']:
        nodes.append(node['id'])
    for link in result['links']:
        source = nodes.index(link['source'])
        target = nodes.index(link['target'])
        links.append((source, target))

    graph = Graph()
    graph.add_vertices(len(nodes))
    graph.add_edges(links)
    lay = graph.layout(layout_type)

    for node in result['nodes']:
        for i, row in enumerate(lay):
            if nodes[i] == node['id']:
                node['x'] = row[0]
                node['y'] = row[1]
                break

    for link in result['links']:
        for node in result['nodes']:
            if link['source'] == node['id']:
                link['x1'] = node['x']
                link['y1'] = node['y']
            if link['target'] == node['id']:
                link['x2'] = node['x']
                link['y2'] = node['y']


@app.route('/')
def index():
    return render_template('index.html')


# 初始化数据
@app.route('/initial')
def get_initial_data():
    try:  # try ... catch
        with open('files/jsonFormat/time-line.json') as fi:
            result = json.load(fi)
            return jsonify(result)
    except:
        print 'error'
        return jsonify({})


# 返回布局数据
@app.route('/layout')
def get_back_layout_data():
    layout_type = request.args.get('layout_type')
    global upload_path
    try:
        if upload_path:
            with open(upload_path) as fi:
                content = fi.read()
                content = content.decode('utf-8-sig') if content.startswith(
                    codecs.BOM_UTF8) else content
                result = json.loads(content, encoding='utf8')
                if (result['nodes'][0].has_key('degree')):
                    result = chang_data(result)
                cal_back_layout_data(result, layout_type)
                calNetwork.cal_characters_arguments(result)
                return jsonify(result)
        else:
            with open('files/jsonFormat/small-443nodes-476edges.json') as fi:
                result = json.load(fi)
                cal_back_layout_data(result, layout_type)
                calNetwork.cal_characters_arguments(result)
                return jsonify(result)
    except:
        print 'error'
        return jsonify({})


# 刷取数据
@app.route('/brush_extent')
def get_brush_extent_data():
    # 标记时间的起始节点
    flag = False
    # 记录节点id
    nodes = []
    # 记录边id
    links = []
    result = {'nodes': [], 'links': []}
    start_time = request.args.get('start')
    end_time = request.args.get('end')
    layout_type = request.args.get('layout_type')
    path = 'files/jsonFormat/packages/'
    files = os.listdir(path)
    for f in files:
        # 排除非标准格式的文件名
        date = re.match(r"(\d{4}-\d{1,2}-\d{1,2}\s\d{1,2}_\d{1,2})", f)
        if date:
            time = f.replace('.json', '')
            time = time.replace('_', ':')
            if time == start_time:
                flag = not flag
            if time == end_time:
                flag = not flag
            if flag:
                with open(path + f) as fi:
                    json_data = json.load(fi)
                    for node in json_data['nodes']:
                        if node['id'] not in nodes:
                            result['nodes'].append(node)
                            nodes.append(node['id'])
                        else:
                            for re_node in result['nodes']:
                                if re_node['id'] == node['id']:
                                    result['nodes'].remove(re_node)
                                    result['nodes'].append(node)
                                    break
                    for link in json_data['links']:
                        if link['id'] not in links:
                            result['links'].append(link)
                            links.append(link['id'])
                        else:
                            for re_link in result['links']:
                                if re_link['id'] == link['id']:
                                    result['links'].remove(re_link)
                                    result['links'].append(link)
                                    break
    try:  # try ... catch
        cal_back_layout_data(result, layout_type)
        calNetwork.cal_characters_arguments(result)
        return jsonify(result)
    except:
        print 'error'
        return jsonify({})


# 保存上传文件数据
@app.route('/upload_file', methods=['GET', 'POST'])
def up_load_file():
    if request.method == 'POST':
        file_data = request.files['upload']
        if file_data:
            global upload_file_index
            global upload_path
            upload_path = 'files/uploadFiles/' + \
                bytes(upload_file_index) + '.json'
            file_data.save(upload_path)
            upload_file_index += 1
            return upload_path
        else:
            return 'error'


# 返回上传文件的布局数据
@app.route('/upload_file/layout')
def up_load_file_layout():
    layout_type = request.args.get('layout_type')
    file_path = request.args.get('file_path')
    with open(file_path) as fi:
        content = fi.read()
        content = content.decode('utf-8-sig') if content.startswith(
            codecs.BOM_UTF8) else content
        result = json.loads(content, encoding='utf8')
        if (result['nodes'][0].has_key('degree')):
            result = chang_data(result)
        cal_back_layout_data(result, layout_type)
        calNetwork.cal_characters_arguments(result)
        return jsonify(result)


if __name__ == '__main__':
    app.debug = True
    app.run(host='0.0.0.0')
