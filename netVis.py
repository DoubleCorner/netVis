# coding=utf-8
from flask import Flask, request
from flask import render_template, jsonify
import pandas as pd
from igraph import *
import csv
import json
import os
import calNetwork as features

all_files_data = []
layout_data = []
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

    file_data = csv.DictReader(open('files/small-443nodes-476edges.csv'))
    for item in file_data:
        layout_data.append(item)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/initial')
def get_initial_data():
    return jsonify(time_data)


@app.route('/front_layout')
def get_front_layout_data():
    layout_type = request.args.get('layout_type')
    result = {"nodes": [], "links": []}
    nodes = []
    for item in layout_data:
        if not item['source'] in nodes:
            nodes.append(item['source'])
            result['nodes'].append({'id': item['source']})
        if not item['target'] in nodes:
            nodes.append(item['target'])
            result['nodes'].append({'id': item['target']})
    result['links'] = layout_data

    features.cal_characters_arguments(result, layout_type)
    return jsonify(result)


@app.route('/back_layout')
def get_back_layout_data():
    layout_type = request.args.get('layout_type')
    nodes = []
    result = {"nodes": [], "links": []}
    links = []
    for item in layout_data:
        if not item['source'] in nodes:
            nodes.append(item['source'])
        if not item['target'] in nodes:
            nodes.append(item['target'])

    for item in layout_data:
        source = nodes.index(item['source'])
        target = nodes.index(item['target'])
        link = (source, target)
        links.append(link)

    graph = Graph()
    graph.add_vertices(len(nodes))
    graph.add_edges(links)
    lay = graph.layout(layout_type)
    for i, row in enumerate(lay):
        node = {'id': nodes[i], 'x': row[0], 'y': row[1]}
        result['nodes'].append(node)

    for item in layout_data:
        edge = {'source': item['source'], 'target': item['target']}
        for node in result['nodes']:
            if item['source'] == node['id']:
                edge['x1'] = node['x']
                edge['y1'] = node['y']
            if item['target'] == node['id']:
                edge['x2'] = node['x']
                edge['y2'] = node['y']
        result['links'].append(edge)

    features.cal_characters_arguments(result, layout_type)
    return jsonify(result)


@app.route('/brush_extent')
def get_brush_extent_data():
    flag = False
    nodes = []
    result = {"nodes": [], "links": []}
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
    if layout_type != 'force' and layout_type != 'bundle':
        cal_back_layout_data(nodes, result, layout_type)

    features.cal_characters_arguments(result,layout_type)
    return jsonify(result)


def cal_back_layout_data(nodes, result, layout_type):
    links = []
    result['nodes'] = []
    for item in result['links']:
        source = nodes.index(item['source'])
        target = nodes.index(item['target'])
        link = (source, target)
        links.append(link)
    graph = Graph()
    graph.add_vertices(len(nodes))
    graph.add_edges(links)
    lay = graph.layout(layout_type)
    for i, row in enumerate(lay):
        node = {'id': nodes[i], 'x': row[0], 'y': row[1]}
        result['nodes'].append(node)
    for item in result['links']:
        for node in result['nodes']:
            if item['source'] == node['id']:
                item['x1'] = node['x']
                item['y1'] = node['y']
            if item['target'] == node['id']:
                item['x2'] = node['x']
                item['y2'] = node['y']


if __name__ == '__main__':
    app.debug = True
    read_packages()
    app.run(host='0.0.0.0')
