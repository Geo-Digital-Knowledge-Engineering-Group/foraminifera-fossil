import React from 'react';

function Predict() {
  return (
    <div style={{ display: 'flex', gap: '30px', padding: '40px', justifyContent: 'center', alignItems: 'center' }}>
      {/* LEFT SIDE: INPUT */}
      <div style={{ border: '3px solid #a8e063', padding: '30px', borderRadius: '4px', width: '40%', minHeight: '320px' }}>
        <h2 style={{ margin: 0, fontWeight: 'bold' }}>INPUT</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" style={{ border: '2px solid #a8e063', width: '100px', height: '25px' }} />
            <div style={{ borderBottom: '2px solid #a8e063', width: '150px' }}></div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" style={{ border: '2px solid #a8e063', width: '100px', height: '25px' }} />
            <div style={{ borderBottom: '2px solid #a8e063', width: '150px' }}></div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" style={{ border: '2px solid #a8e063', width: '100px', height: '25px' }} />
            <div style={{ borderBottom: '2px solid #a8e063', width: '150px' }}></div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" style={{ border: '2px solid #a8e063', width: '100px', height: '25px' }} />
            <div style={{ borderBottom: '2px solid #a8e063', width: '150px' }}></div>
          </div>
        </div>
      </div>

      {/* ARROW */}
      <div style={{ color: '#a8e063', fontSize: '40px', fontWeight: 'bold' }}>
        ⇨ <span style={{ fontSize: '18px', verticalAlign: 'middle' }}>results</span>
      </div>

      {/* RIGHT SIDE: RESULTS / FOSSIL */}
      <div style={{ border: '3px solid #a8e063', padding: '30px', borderRadius: '4px', width: '40%', minHeight: '320px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginRight: '40px' }}>
          <span style={{ fontSize: '70px', color: '#a8e063', lineHeight: '1' }}>✦</span>
          <p style={{ color: '#a8e063', fontWeight: 'bold', margin: '5px 0 0 0' }}>fossil</p>
        </div>
      </div>
    </div>
  );
}

export default Predict;