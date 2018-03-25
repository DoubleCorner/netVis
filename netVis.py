# coding=utf-8
import csv
import json
import copy
import calNetwork

import pandas as pd
from flask import Flask, request
from flask import render_template, jsonify
from igraph import *
from werkzeug.utils import secure_filename

all_files_data = []
layout_data = {}
time_data = []

app = Flask(__name__)


def read_packages():
    path = 'files/package/'
    files = os.listdir(path)
    for f in files:
        file_data = pd.read_csv(path + f)
        json_data = file_data.to_json(orient='records')
        data = json.loads(json_data)
        f = f.replace('.csv', '')
        f = f.replace('_', ':')
        item = {'time': f, 'data': data}
        all_files_data.append(item)

    file_data = csv.DictReader(open('files/time_line.csv'))
    for item in file_data:
        time_data.append(item)

    file_data = json.load(open('files/small-443nodes-476edges.json'))
    layout_data['nodes'] = file_data['nodes']
    layout_data['links'] = file_data['links']


def cal_back_layout_data(result, layout_type):
    if layout_type == 'force' or layout_type == 'bundle':
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


@app.route('/initial')
def get_initial_data():
    return jsonify(time_data)


@app.route('/layout')
def get_back_layout_data():
    layout_type = request.args.get('layout_type')
    result = copy.deepcopy(layout_data)
    cal_back_layout_data(result, layout_type)
    calNetwork.cal_characters_arguments(result)
    return jsonify(result)


@app.route('/brush_extent')
def get_brush_extent_data():
    flag = False
    nodes = []
    result = {'nodes': [], 'links': []}
    start_time = request.args.get('start')
    end_time = request.args.get('end')
    layout_type = request.args.get('layout_type')
    for item in all_files_data:
        if item['time'] == start_time:
            flag = not flag
        if item['time'] == end_time:
            flag = not flag
        if flag:
            for edge in item['data']:
                if edge not in result['links']:
                    edge['source'] = str(edge['source'])
                    edge['target'] = str(edge['target'])
                    result['links'].append(edge)
    for edges in result['links']:
        if not edges['source'] in nodes:
            nodes.append(edges['source'])
            result['nodes'].append({'id': edges['source']})
        if not edges['target'] in nodes:
            nodes.append(edges['target'])
            result['nodes'].append({'id': edges['target']})

    cal_back_layout_data(result, layout_type)
    calNetwork.cal_characters_arguments(result)
    return jsonify(result)


@app.route('/upload_file', methods=['GET', 'POST'])
def up_load_file():
    if request.method == 'POST':
        file_data = request.files['upload']
        if file_data:
            upload_path = os.path.join('files/', secure_filename(file_data.filename))
            file_data.save(upload_path)
            return upload_path
        else:
            return 'error'


@app.route('/upload_file/layout')
def up_load_file_layout():
    layout_type = request.args.get('layout_type')
    file_path = request.args.get('file_path')
    result = {}
    file_data = json.load(open(file_path))
    result['nodes'] = file_data['nodes']
    result['links'] = file_data['links']

    cal_back_layout_data(result, layout_type)
    calNetwork.cal_characters_arguments(result)
    return jsonify(result)


if __name__ == '__main__':
    app.debug = True
    read_packages()
    app.run(host='0.0.0.0')
