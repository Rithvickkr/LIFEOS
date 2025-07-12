'use client';
import React, { useEffect, useState } from 'react';
import ReactFlow, { Controls, Background, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';

export default function MindMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/mindmap`)
      .then(res => {
        const fetchedNodes = res.data.nodes.map((node: any) => ({
          ...node,
          position: { x: Math.random() * 600, y: Math.random() * 400 }  // Random for start
        }));
        setNodes(fetchedNodes);
        setEdges(res.data.edges);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-center">Loading mind map...</p>;

  return (
    <div style={{ height: '80vh' }} className="bg-[#1A1D29]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Controls />
        <Background color="#FFE36E" gap={16} />
      </ReactFlow>
    </div>
  );
}