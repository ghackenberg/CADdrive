from flask import Flask, request, Response
from requests_toolbelt import MultipartEncoder

import os, glob
from pathlib import PureWindowsPath, PurePosixPath
import shutil

app = Flask(__name__)

@app.post("/simulate")
def simulate():

    # Path for simulation model and results

    modelpath = "/work/aster"

    jobname = "job"
  
    # Step 1: Delete temporary files

    delete_files = f"{modelpath}/*"
    for f in glob.glob(delete_files):
        print(f)
        if os.path.isdir(f):
            shutil.rmtree(f)
        else:
            os.remove(f)

    # Step 2: Save request files to disk
    
    request.files["mail"].save(f"{modelpath}/{jobname}.mail")
    request.files["comm"].save(f"{modelpath}/{jobname}.comm")
    
    # Step 3: Generate corresponding export file

    generateExportFile(modelpath, jobname)
      
    # Step 4: Start code_aster simulation
    
    startSimulation(modelpath, jobname)
    
    # Step 5: Return simulation results as string

    fname_resu = f'{modelpath}/{jobname}.resu'
    fname_rmed = f'{modelpath}/{jobname}.rmed'
    
    m = MultipartEncoder(
        fields = {
            'resu': (f'{jobname}.resu', open(fname_resu, 'rb'), 'text/plain'),
            'rmed': (f'{jobname}.rmed', open(fname_rmed, 'rb'), 'application/octet-stream')
        }
    )

    return Response(m.to_string(), mimetype = m.content_type)

@app.post("/translate")
def translate():
    
    # translate LDR into MAIL and COMM
    pass
    
def generateExportFile(modelpath, jobname):

    fname_export = f"{modelpath}/{jobname}.export"

    print(f"Writing export file: {fname_export}")
    
    fid = open(fname_export, 'w')
       
    fid.write('P actions make_etude\n')
    fid.write('P consbtc yes\n')
    fid.write('P mem_aster 100\n')
    fid.write('P memjob 524288\n')
    fid.write('P memory_limit 512.0\n')
    fid.write('P mode interactif\n')
    fid.write('P mpi_nbcpu 1\n')
    fid.write('P mpi_nbnoeud 1\n')
    fid.write('P ncpus 1\n')
    fid.write('P origine ASTK 2021.0\n')
    fid.write('P rep_trav /tmp/aster-3bf3ee11d600-interactif_10\n')
    fid.write('P soumbtc yes\n')
    fid.write('P testlist submit ci verification sequential\n')
    fid.write('P time_limit 30.0\n')
    fid.write('P tpsjob 1\n')
    fid.write('P version /aster/aster/share/aster\n')
    fid.write('A memjeveux 64.0\n')
    fid.write('A tpmax 30.0\n')
    
    fid.write('\n')
    
    fid.write(f'F comm {jobname}.comm D  1\n')
    fid.write(f'F libr {jobname}.mail D  20\n')
    fid.write(f'F libr {jobname}.med R  21\n')
    fid.write(f'F libr {jobname}.rmed R  3\n')
    fid.write(f'F libr {jobname}.resu R  8\n')
    fid.write(f'F mess {jobname}.message R  6\n')
    fid.write(f'R base base-stage_{jobname} R  0\n')

    fid.close()

def startSimulation(modelpath, jobname):

    command = f"as_run {modelpath}/{jobname}.export"

    print(command)

    ret = os.system(command)

    print(ret)

    if ret:
        raise NameError("Code_Aster exited with error")
